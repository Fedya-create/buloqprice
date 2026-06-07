const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../db/pool');
const { authenticate, requireApproved, authorize } = require('../middleware/auth');

const router = express.Router();

// Multer config for Excel uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Faqat Excel fayllar qabul qilinadi'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Get distributor dashboard stats
router.get('/dashboard', authenticate, requireApproved, authorize('distributor'), async (req, res) => {
  try {
    const distResult = await pool.query('SELECT id FROM distributors WHERE user_id = $1', [req.user.id]);
    const distributorId = distResult.rows[0].id;

    // Today's orders count
    const todayOrders = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE distributor_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [distributorId]
    );

    // Total revenue
    const totalRevenue = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE distributor_id = $1 AND status != 'cancelled'`,
      [distributorId]
    );

    // Pending orders
    const pendingOrders = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE distributor_id = $1 AND status = 'pending'`,
      [distributorId]
    );

    // Top selling drugs
    const topDrugs = await pool.query(`
      SELECT oi.drug_name, SUM(oi.quantity) as total_qty, SUM(oi.total) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.distributor_id = $1 AND o.status != 'cancelled'
      GROUP BY oi.drug_name
      ORDER BY total_qty DESC
      LIMIT 10
    `, [distributorId]);

    // Total products in warehouse
    const totalProducts = await pool.query(
      `SELECT COUNT(*) FROM distributor_drugs WHERE distributor_id = $1 AND is_available = TRUE`,
      [distributorId]
    );

    res.json({
      stats: {
        todayOrders: parseInt(todayOrders.rows[0].count),
        totalRevenue: parseFloat(totalRevenue.rows[0].total),
        pendingOrders: parseInt(pendingOrders.rows[0].count),
        totalProducts: parseInt(totalProducts.rows[0].count)
      },
      topDrugs: topDrugs.rows
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get distributor's drug inventory
router.get('/inventory', authenticate, requireApproved, authorize('distributor'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    const distResult = await pool.query('SELECT id FROM distributors WHERE user_id = $1', [req.user.id]);
    const distributorId = distResult.rows[0].id;

    let query = `
      SELECT dd.*, d.name as drug_name, d.dosage, d.form, d.manufacturer, d.barcode
      FROM distributor_drugs dd
      JOIN drugs d ON dd.drug_id = d.id
      WHERE dd.distributor_id = $1
    `;
    const params = [distributorId];

    if (search) {
      query += ` AND d.name ILIKE '%' || $${params.length + 1} || '%'`;
      params.push(search);
    }

    query += ` ORDER BY d.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({ inventory: result.rows });
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Upload Excel price list
router.post('/upload-pricelist', authenticate, requireApproved, authorize('distributor'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fayl yuklanmadi' });
    }

    const distResult = await pool.query('SELECT id FROM distributors WHERE user_id = $1', [req.user.id]);
    const distributorId = distResult.rows[0].id;

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    let matched = 0;
    let unmatched = 0;
    const unmatchedItems = [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const row of data) {
        const barcode = row['Shtrix-kod'] || row['barcode'] || row['Barcode'];
        const mxik = row['MXIK'] || row['mxik_code'];
        const name = row['Nomi'] || row['name'] || row['Name'] || row['Dori nomi'];
        const price = parseFloat(row['Narx'] || row['price'] || row['Price'] || 0);
        const quantity = parseInt(row['Soni'] || row['quantity'] || row['Qty'] || row['Qoldiq'] || 0);
        const expiryDate = row['Yaroqlilik'] || row['expiry'] || row['Expiry'] || null;
        const batchNumber = row['Partiya'] || row['batch'] || row['Batch'] || null;

        if (!price || price <= 0) continue;

        // Try to match by barcode first, then MXIK, then fuzzy name
        let drugId = null;

        if (barcode) {
          const result = await client.query('SELECT id FROM drugs WHERE barcode = $1', [barcode.toString()]);
          if (result.rows.length > 0) drugId = result.rows[0].id;
        }

        if (!drugId && mxik) {
          const result = await client.query('SELECT id FROM drugs WHERE mxik_code = $1', [mxik.toString()]);
          if (result.rows.length > 0) drugId = result.rows[0].id;
        }

        if (!drugId && name) {
          const result = await client.query(
            `SELECT id FROM drugs WHERE similarity(name, $1) > 0.3 ORDER BY similarity(name, $1) DESC LIMIT 1`,
            [name]
          );
          if (result.rows.length > 0) drugId = result.rows[0].id;
        }

        if (drugId) {
          await client.query(`
            INSERT INTO distributor_drugs (distributor_id, drug_id, price, quantity, expiry_date, batch_number, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (distributor_id, drug_id, batch_number)
            DO UPDATE SET price = $3, quantity = $4, expiry_date = $5, updated_at = NOW(), is_available = TRUE
          `, [distributorId, drugId, price, quantity, expiryDate, batchNumber || 'default']);
          matched++;
        } else {
          unmatched++;
          unmatchedItems.push({ name, barcode, price });
        }
      }

      await client.query('COMMIT');

      res.json({
        message: 'Fayl muvaffaqiyatli yuklandi',
        results: {
          totalRows: data.length,
          matched,
          unmatched,
          unmatchedItems: unmatchedItems.slice(0, 20) // Show first 20 unmatched
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Upload pricelist error:', err);
    res.status(500).json({ error: 'Faylni qayta ishlashda xatolik' });
  }
});

// Update single drug price/quantity
router.patch('/inventory/:id', authenticate, requireApproved, authorize('distributor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { price, quantity, isAvailable, discountPercent } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (price !== undefined) { updates.push(`price = $${paramCount++}`); values.push(price); }
    if (quantity !== undefined) { updates.push(`quantity = $${paramCount++}`); values.push(quantity); }
    if (isAvailable !== undefined) { updates.push(`is_available = $${paramCount++}`); values.push(isAvailable); }
    if (discountPercent !== undefined) { updates.push(`discount_percent = $${paramCount++}`); values.push(discountPercent); }
    updates.push(`updated_at = NOW()`);

    values.push(id);
    const result = await pool.query(
      `UPDATE distributor_drugs SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Element topilmadi' });
    }

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('Update inventory error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get incoming orders for distributor
router.get('/orders', authenticate, requireApproved, authorize('distributor'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const distResult = await pool.query('SELECT id FROM distributors WHERE user_id = $1', [req.user.id]);
    const distributorId = distResult.rows[0].id;

    let query = `
      SELECT o.*, p.name as pharmacy_name, p.city as pharmacy_city
      FROM orders o
      JOIN pharmacies p ON o.pharmacy_id = p.id
      WHERE o.distributor_id = $1
    `;
    const params = [distributorId];

    if (status) {
      query += ` AND o.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({ orders: result.rows });
  } catch (err) {
    console.error('Get distributor orders error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get pharmacy clients (customers)
router.get('/clients', authenticate, requireApproved, authorize('distributor'), async (req, res) => {
  try {
    const distResult = await pool.query('SELECT id FROM distributors WHERE user_id = $1', [req.user.id]);
    const distributorId = distResult.rows[0].id;

    const result = await pool.query(`
      SELECT DISTINCT p.id, p.name, p.city, p.region, p.contact_person, p.address,
             COUNT(o.id) as total_orders,
             COALESCE(SUM(o.total_amount), 0) as total_spent,
             MAX(o.created_at) as last_order_date
      FROM pharmacies p
      JOIN orders o ON o.pharmacy_id = p.id
      WHERE o.distributor_id = $1
      GROUP BY p.id
      ORDER BY total_spent DESC
    `, [distributorId]);

    res.json({ clients: result.rows });
  } catch (err) {
    console.error('Get clients error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
