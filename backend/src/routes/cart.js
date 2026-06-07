const express = require('express');
const pool = require('../db/pool');
const { authenticate, requireApproved, authorize } = require('../middleware/auth');

const router = express.Router();

// Get cart items (grouped by distributor)
router.get('/', authenticate, requireApproved, authorize('pharmacy'), async (req, res) => {
  try {
    const pharmacyResult = await pool.query('SELECT id FROM pharmacies WHERE user_id = $1', [req.user.id]);
    const pharmacyId = pharmacyResult.rows[0].id;

    const result = await pool.query(`
      SELECT ci.id, ci.quantity, ci.created_at,
             dd.price, dd.discount_percent, dd.distributor_id,
             d.id as drug_id, d.name as drug_name, d.dosage, d.form, d.manufacturer,
             dist.company_name as distributor_name
      FROM cart_items ci
      JOIN distributor_drugs dd ON ci.distributor_drug_id = dd.id
      JOIN drugs d ON dd.drug_id = d.id
      JOIN distributors dist ON dd.distributor_id = dist.id
      WHERE ci.pharmacy_id = $1
      ORDER BY dist.company_name, d.name
    `, [pharmacyId]);

    // Group by distributor
    const grouped = {};
    for (const item of result.rows) {
      if (!grouped[item.distributor_name]) {
        grouped[item.distributor_name] = {
          distributor_id: item.distributor_id,
          distributor_name: item.distributor_name,
          items: [],
          subtotal: 0
        };
      }
      const itemTotal = item.price * item.quantity;
      grouped[item.distributor_name].items.push({ ...item, total: itemTotal });
      grouped[item.distributor_name].subtotal += itemTotal;
    }

    const total = Object.values(grouped).reduce((sum, g) => sum + g.subtotal, 0);

    res.json({ cart: Object.values(grouped), total, itemCount: result.rows.length });
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Add item to cart
router.post('/', authenticate, requireApproved, authorize('pharmacy'), async (req, res) => {
  try {
    const { distributorDrugId, quantity = 1 } = req.body;

    const pharmacyResult = await pool.query('SELECT id FROM pharmacies WHERE user_id = $1', [req.user.id]);
    const pharmacyId = pharmacyResult.rows[0].id;

    // Check if distributor drug exists and is available
    const ddResult = await pool.query(
      'SELECT * FROM distributor_drugs WHERE id = $1 AND is_available = TRUE', [distributorDrugId]
    );
    if (ddResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dori mavjud emas' });
    }

    // Check stock
    if (ddResult.rows[0].quantity < quantity) {
      return res.status(400).json({ error: 'Omborda yetarli miqdor yo\'q' });
    }

    // Upsert cart item
    const result = await pool.query(`
      INSERT INTO cart_items (pharmacy_id, distributor_drug_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (pharmacy_id, distributor_drug_id)
      DO UPDATE SET quantity = cart_items.quantity + $3
      RETURNING *
    `, [pharmacyId, distributorDrugId, quantity]);

    res.status(201).json({ cartItem: result.rows[0] });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Update cart item quantity
router.patch('/:id', authenticate, requireApproved, authorize('pharmacy'), async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ error: 'Miqdor 1 dan kam bo\'lishi mumkin emas' });
    }

    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *',
      [quantity, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Savatda bunday element topilmadi' });
    }

    res.json({ cartItem: result.rows[0] });
  } catch (err) {
    console.error('Update cart error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Remove item from cart
router.delete('/:id', authenticate, requireApproved, authorize('pharmacy'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM cart_items WHERE id = $1', [id]);
    res.json({ message: 'Savatdan o\'chirildi' });
  } catch (err) {
    console.error('Remove from cart error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Clear entire cart
router.delete('/', authenticate, requireApproved, authorize('pharmacy'), async (req, res) => {
  try {
    const pharmacyResult = await pool.query('SELECT id FROM pharmacies WHERE user_id = $1', [req.user.id]);
    const pharmacyId = pharmacyResult.rows[0].id;

    await pool.query('DELETE FROM cart_items WHERE pharmacy_id = $1', [pharmacyId]);
    res.json({ message: 'Savat tozalandi' });
  } catch (err) {
    console.error('Clear cart error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
