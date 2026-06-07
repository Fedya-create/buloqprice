const express = require('express');
const pool = require('../db/pool');
const { authenticate, requireApproved, authorize } = require('../middleware/auth');

const router = express.Router();

// Create order from cart (Pharmacy)
router.post('/', authenticate, requireApproved, authorize('pharmacy'), async (req, res) => {
  try {
    const { notes } = req.body;

    // Get pharmacy
    const pharmacyResult = await pool.query('SELECT id FROM pharmacies WHERE user_id = $1', [req.user.id]);
    if (pharmacyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dorixona profili topilmadi' });
    }
    const pharmacyId = pharmacyResult.rows[0].id;

    // Get cart items grouped by distributor
    const cartItems = await pool.query(`
      SELECT ci.*, dd.drug_id, dd.price, dd.distributor_id, dd.quantity as stock_qty,
             d.name as drug_name
      FROM cart_items ci
      JOIN distributor_drugs dd ON ci.distributor_drug_id = dd.id
      JOIN drugs d ON dd.drug_id = d.id
      WHERE ci.pharmacy_id = $1
    `, [pharmacyId]);

    if (cartItems.rows.length === 0) {
      return res.status(400).json({ error: 'Savat bo\'sh' });
    }

    // Group items by distributor
    const groupedByDistributor = {};
    for (const item of cartItems.rows) {
      if (!groupedByDistributor[item.distributor_id]) {
        groupedByDistributor[item.distributor_id] = [];
      }
      groupedByDistributor[item.distributor_id].push(item);
    }

    const client = await pool.connect();
    const createdOrders = [];

    try {
      await client.query('BEGIN');

      // Create separate order for each distributor
      for (const [distributorId, items] of Object.entries(groupedByDistributor)) {
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const orderResult = await client.query(
          `INSERT INTO orders (pharmacy_id, distributor_id, total_amount, notes) 
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [pharmacyId, distributorId, totalAmount, notes]
        );
        const order = orderResult.rows[0];

        // Create order items
        for (const item of items) {
          await client.query(
            `INSERT INTO order_items (order_id, drug_id, drug_name, quantity, price, total)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [order.id, item.drug_id, item.drug_name, item.quantity, item.price, item.price * item.quantity]
          );
        }

        // Add status history
        await client.query(
          `INSERT INTO order_status_history (order_id, status, created_by, comment)
           VALUES ($1, 'pending', $2, 'Buyurtma yaratildi')`,
          [order.id, req.user.id]
        );

        createdOrders.push(order);
      }

      // Clear cart
      await client.query('DELETE FROM cart_items WHERE pharmacy_id = $1', [pharmacyId]);

      await client.query('COMMIT');

      res.status(201).json({
        message: `${createdOrders.length} ta buyurtma muvaffaqiyatli yaratildi`,
        orders: createdOrders
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get pharmacy orders
router.get('/my-orders', authenticate, requireApproved, authorize('pharmacy'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const pharmacyResult = await pool.query('SELECT id FROM pharmacies WHERE user_id = $1', [req.user.id]);
    const pharmacyId = pharmacyResult.rows[0].id;

    let query = `
      SELECT o.*, dist.company_name as distributor_name
      FROM orders o
      JOIN distributors dist ON o.distributor_id = dist.id
      WHERE o.pharmacy_id = $1
    `;
    const params = [pharmacyId];

    if (status) {
      query += ` AND o.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({ orders: result.rows });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get order details with items
router.get('/:id', authenticate, requireApproved, async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query(`
      SELECT o.*, dist.company_name as distributor_name, p.name as pharmacy_name
      FROM orders o
      JOIN distributors dist ON o.distributor_id = dist.id
      JOIN pharmacies p ON o.pharmacy_id = p.id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Buyurtma topilmadi' });
    }

    const order = orderResult.rows[0];

    // Verify access
    const pharmacyResult = await pool.query('SELECT id FROM pharmacies WHERE user_id = $1', [req.user.id]);
    const distributorResult = await pool.query('SELECT id FROM distributors WHERE user_id = $1', [req.user.id]);

    const pharmacyId = pharmacyResult.rows[0]?.id;
    const distributorId = distributorResult.rows[0]?.id;

    if (req.user.role !== 'admin' && order.pharmacy_id !== pharmacyId && order.distributor_id !== distributorId) {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }

    // Get order items
    const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);

    // Get status history
    const history = await pool.query(
      'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC', [id]
    );

    res.json({ order, items: items.rows, history: history.rows });
  } catch (err) {
    console.error('Get order details error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Update order status (Distributor)
router.patch('/:id/status', authenticate, requireApproved, authorize('distributor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    const validStatuses = ['confirmed', 'shipping', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Noto\'g\'ri status' });
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Buyurtma topilmadi' });
    }

    // Update order status
    await pool.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);

    // Add history entry
    await pool.query(
      'INSERT INTO order_status_history (order_id, status, created_by, comment) VALUES ($1, $2, $3, $4)',
      [id, status, req.user.id, comment]
    );

    res.json({ message: 'Buyurtma statusi yangilandi', status });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
