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

// Preview Excel file (parse columns and sample rows without saving)
router.post('/preview-pricelist', authenticate, requireApproved, authorize('distributor'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fayl yuklanmadi' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Try to find header row (look for row with multiple text values)
    const range = XLSX.utils.decode_range(sheet['!ref']);
    let headerRow = 0;
    
    // Check first 30 rows to find the actual header
    for (let r = range.s.r; r <= Math.min(range.e.r, 30); r++) {
      let textCellCount = 0;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.t === 's' && cell.v && cell.v.toString().trim().length > 1) {
          textCellCount++;
        }
      }
      // If we find 3+ text cells in a row, likely the header
      if (textCellCount >= 3) {
        headerRow = r;
        break;
      }
    }

    const data = XLSX.utils.sheet_to_json(sheet, { range: headerRow });

    if (data.length === 0) {
      return res.status(400).json({ error: 'Fayl bo\'sh yoki formati noto\'g\'ri' });
    }

    // Get column names from first data row
    const columns = Object.keys(data[0]).filter(k => k !== '__EMPTY' && !k.startsWith('__'));
    // Sample first 5 rows for preview
    const sampleRows = data.slice(0, 5);

    res.json({
      columns,
      sampleRows,
      totalRows: data.length,
      headerRow: headerRow + 1 // 1-indexed for user display
    });
  } catch (err) {
    console.error('Preview pricelist error:', err);
    res.status(500).json({ error: 'Faylni o\'qishda xatolik' });
  }
});

// Upload Excel price list with column mapping
router.post('/upload-pricelist', authenticate, requireApproved, authorize('distributor'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fayl yuklanmadi' });
    }

    const distResult = await pool.query('SELECT id FROM distributors WHERE user_id = $1', [req.user.id]);
    const distributorId = distResult.rows[0].id;

    // Parse mapping from request
    let mapping = {};
    try {
      mapping = JSON.parse(req.body.mapping || '{}');
    } catch (e) {
      // Fallback: use default column names
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Auto-detect header row
    const range = XLSX.utils.decode_range(sheet['!ref']);
    let headerRow = 0;
    for (let r = range.s.r; r <= Math.min(range.e.r, 30); r++) {
      let textCellCount = 0;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.t === 's' && cell.v && cell.v.toString().trim().length > 1) {
          textCellCount++;
        }
      }
      if (textCellCount >= 3) { headerRow = r; break; }
    }

    const data = XLSX.utils.sheet_to_json(sheet, { range: headerRow });

    let matched = 0;
    let unmatched = 0;
    const unmatchedItems = [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const row of data) {
        // Use mapping to get values, fallback to common column names
        const barcode = mapping.barcode ? row[mapping.barcode] : (row['Shtrix-kod'] || row['barcode'] || row['Barcode']);
        const mxik = mapping.mxik ? row[mapping.mxik] : (row['MXIK'] || row['mxik_code']);
        const name = mapping.name ? row[mapping.name] : (row['Nomi'] || row['name'] || row['Name'] || row['Dori nomi']);
        const price = parseFloat(mapping.price ? row[mapping.price] : (row['Narx'] || row['price'] || row['Price'] || 0));
        const quantity = parseInt(mapping.quantity ? row[mapping.quantity] : (row['Soni'] || row['quantity'] || row['Qty'] || row['Qoldiq'] || 0)) || 0;
        const expiryDate = mapping.expiry ? row[mapping.expiry] : (row['Yaroqlilik'] || row['expiry'] || row['Expiry'] || null);
        const batchNumber = mapping.batch ? row[mapping.batch] : (row['Partiya'] || row['batch'] || row['Batch'] || null);

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
          // Try fuzzy search with lower threshold
          const result = await client.query(
            `SELECT id, name, similarity(name, $1) as sim FROM drugs 
             WHERE name % $1 OR name ILIKE '%' || $1 || '%' OR name_latin ILIKE '%' || $1 || '%'
             ORDER BY similarity(name, $1) DESC LIMIT 1`,
            [name]
          );
          if (result.rows.length > 0 && result.rows[0].sim > 0.2) {
            drugId = result.rows[0].id;
          }
        }

        if (drugId) {
          // Drug found in database - link it
          await client.query(`
            INSERT INTO distributor_drugs (distributor_id, drug_id, price, quantity, expiry_date, batch_number, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (distributor_id, drug_id, batch_number)
            DO UPDATE SET price = $3, quantity = $4, expiry_date = $5, updated_at = NOW(), is_available = TRUE
          `, [distributorId, drugId, price, quantity, expiryDate, batchNumber || 'default']);
          matched++;
        } else if (name) {
          // Drug NOT found - create new drug entry and link it
          const newDrug = await client.query(`
            INSERT INTO drugs (name, barcode, mxik_code, manufacturer)
            VALUES ($1, $2, $3, $4)
            RETURNING id
          `, [name, barcode || null, mxik || null, null]);
          
          const newDrugId = newDrug.rows[0].id;

          await client.query(`
            INSERT INTO distributor_drugs (distributor_id, drug_id, price, quantity, expiry_date, batch_number, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (distributor_id, drug_id, batch_number)
            DO UPDATE SET price = $3, quantity = $4, expiry_date = $5, updated_at = NOW(), is_available = TRUE
          `, [distributorId, newDrugId, price, quantity, expiryDate, batchNumber || 'default']);
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
          unmatchedItems: unmatchedItems.slice(0, 20)
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
