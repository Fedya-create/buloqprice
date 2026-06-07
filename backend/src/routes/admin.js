const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get pending users for moderation
router.get('/moderation', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status = 'pending', role, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT u.id, u.email, u.role, u.status, u.phone, u.created_at FROM users u WHERE u.status = $1`;
    const params = [status];

    if (role) {
      query += ` AND u.role = $${params.length + 1}`;
      params.push(role);
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get profiles for each user
    const users = [];
    for (const user of result.rows) {
      let profile = null;
      if (user.role === 'pharmacy') {
        const pResult = await pool.query('SELECT * FROM pharmacies WHERE user_id = $1', [user.id]);
        profile = pResult.rows[0];
      } else if (user.role === 'distributor') {
        const dResult = await pool.query('SELECT * FROM distributors WHERE user_id = $1', [user.id]);
        profile = dResult.rows[0];
      }
      users.push({ ...user, profile });
    }

    res.json({ users });
  } catch (err) {
    console.error('Moderation error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Approve or reject user
router.patch('/moderation/:userId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Noto\'g\'ri amal' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, userId]);

    res.json({ message: `Foydalanuvchi ${action === 'approve' ? 'tasdiqlandi' : 'rad etildi'}` });
  } catch (err) {
    console.error('Moderation action error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Block/Unblock user
router.patch('/users/:userId/block', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { blocked } = req.body;

    // Admin o'zini bloklashni oldini olish
    if (parseInt(userId) === req.user.id && blocked) {
      return res.status(400).json({ error: 'O\'zingizni bloklashingiz mumkin emas!' });
    }

    const newStatus = blocked ? 'blocked' : 'approved';
    await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, userId]);

    res.json({ message: blocked ? 'Foydalanuvchi bloklandi' : 'Foydalanuvchi blokdan chiqarildi' });
  } catch (err) {
    console.error('Block user error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get all users with search/filter
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT u.id, u.email, u.role, u.status, u.phone, u.created_at FROM users u WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.email ILIKE $${params.length})`;
    }
    if (role) {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND u.status = $${params.length}`;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Count total
    let countQuery = `SELECT COUNT(*) FROM users u WHERE 1=1`;
    const countParams = [];
    if (search) { countParams.push(`%${search}%`); countQuery += ` AND u.email ILIKE $${countParams.length}`; }
    if (role) { countParams.push(role); countQuery += ` AND u.role = $${countParams.length}`; }
    if (status) { countParams.push(status); countQuery += ` AND u.status = $${countParams.length}`; }
    const countResult = await pool.query(countQuery, countParams);

    res.json({ users: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Platform statistics
router.get('/statistics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const totalPharmacies = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'pharmacy'`);
    const totalDistributors = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'distributor'`);
    const pendingApprovals = await pool.query(`SELECT COUNT(*) FROM users WHERE status = 'pending'`);

    const totalOrders = await pool.query('SELECT COUNT(*) FROM orders');
    const totalRevenue = await pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'cancelled'`);

    // Orders per day (last 30 days)
    const dailyOrders = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as revenue
      FROM orders 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Top regions
    const regionStats = await pool.query(`
      SELECT p.region, COUNT(o.id) as order_count, SUM(o.total_amount) as revenue
      FROM orders o
      JOIN pharmacies p ON o.pharmacy_id = p.id
      GROUP BY p.region
      ORDER BY revenue DESC
      LIMIT 10
    `);

    res.json({
      overview: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalPharmacies: parseInt(totalPharmacies.rows[0].count),
        totalDistributors: parseInt(totalDistributors.rows[0].count),
        pendingApprovals: parseInt(pendingApprovals.rows[0].count),
        totalOrders: parseInt(totalOrders.rows[0].count),
        totalRevenue: parseFloat(totalRevenue.rows[0].total)
      },
      dailyOrders: dailyOrders.rows,
      regionStats: regionStats.rows
    });
  } catch (err) {
    console.error('Statistics error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
