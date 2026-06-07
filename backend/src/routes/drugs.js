const express = require('express');
const pool = require('../db/pool');
const { authenticate, requireApproved } = require('../middleware/auth');

const router = express.Router();

// Search drugs with fuzzy matching (public for approved users)
router.get('/search', authenticate, requireApproved, async (req, res) => {
  try {
    const { q, barcode, mxik, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query;
    let params;

    if (barcode) {
      // Exact barcode search
      query = `SELECT * FROM drugs WHERE barcode = $1 LIMIT $2 OFFSET $3`;
      params = [barcode, limit, offset];
    } else if (mxik) {
      // MXIK code search
      query = `SELECT * FROM drugs WHERE mxik_code = $1 LIMIT $2 OFFSET $3`;
      params = [mxik, limit, offset];
    } else if (q) {
      // Fuzzy text search using trigram similarity
      query = `
        SELECT *, similarity(name, $1) AS sim_score
        FROM drugs 
        WHERE name % $1 OR name ILIKE '%' || $1 || '%' OR name_latin ILIKE '%' || $1 || '%'
        ORDER BY sim_score DESC, name
        LIMIT $2 OFFSET $3
      `;
      params = [q, limit, offset];
    } else {
      query = `SELECT * FROM drugs ORDER BY name LIMIT $1 OFFSET $2`;
      params = [limit, offset];
    }

    const result = await pool.query(query, params);

    // Get total count
    let countQuery;
    let countParams;
    if (barcode) {
      countQuery = `SELECT COUNT(*) FROM drugs WHERE barcode = $1`;
      countParams = [barcode];
    } else if (mxik) {
      countQuery = `SELECT COUNT(*) FROM drugs WHERE mxik_code = $1`;
      countParams = [mxik];
    } else if (q) {
      countQuery = `SELECT COUNT(*) FROM drugs WHERE name % $1 OR name ILIKE '%' || $1 || '%' OR name_latin ILIKE '%' || $1 || '%'`;
      countParams = [q];
    } else {
      countQuery = `SELECT COUNT(*) FROM drugs`;
      countParams = [];
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      drugs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Drug search error:', err);
    res.status(500).json({ error: 'Qidiruv xatosi' });
  }
});

// Compare prices for a specific drug across distributors
router.get('/:drugId/prices', authenticate, requireApproved, async (req, res) => {
  try {
    const { drugId } = req.params;

    const result = await pool.query(`
      SELECT 
        dd.id, dd.price, dd.quantity, dd.min_order_qty, dd.expiry_date,
        dd.discount_percent, dd.batch_number, dd.is_available,
        d.company_name, d.id as distributor_id, d.city, d.region
      FROM distributor_drugs dd
      JOIN distributors d ON dd.distributor_id = d.id
      JOIN users u ON d.user_id = u.id
      WHERE dd.drug_id = $1 AND dd.is_available = TRUE AND u.status = 'approved'
      ORDER BY dd.price ASC
    `, [drugId]);

    res.json({ prices: result.rows });
  } catch (err) {
    console.error('Price compare error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get drug details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM drugs WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dori topilmadi' });
    }

    res.json({ drug: result.rows[0] });
  } catch (err) {
    console.error('Get drug error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
