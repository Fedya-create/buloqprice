const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().withMessage('Email noto\'g\'ri formatda'),
  body('password').isLength({ min: 6 }).withMessage('Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
  body('role').isIn(['pharmacy', 'distributor']).withMessage('Role noto\'g\'ri'),
  body('phone').optional().isMobilePhone(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, role, phone, profileData } = req.body;

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create user
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, role, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, role, status',
        [email, passwordHash, role, phone]
      );
      const user = userResult.rows[0];

      // Create profile based on role
      if (role === 'pharmacy' && profileData) {
        await client.query(
          `INSERT INTO pharmacies (user_id, name, license_number, address, city, region, inn, contact_person) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [user.id, profileData.name, profileData.licenseNumber, profileData.address, profileData.city, profileData.region, profileData.inn, profileData.contactPerson]
        );
      } else if (role === 'distributor' && profileData) {
        await client.query(
          `INSERT INTO distributors (user_id, company_name, license_number, address, city, region, inn, contact_person, description) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [user.id, profileData.companyName, profileData.licenseNumber, profileData.address, profileData.city, profileData.region, profileData.inn, profileData.contactPerson, profileData.description]
        );
      }

      await client.query('COMMIT');

      const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      });

      res.status(201).json({
        message: 'Ro\'yxatdan muvaffaqiyatli o\'tdingiz. Admin tasdiqlashini kuting.',
        user,
        token
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Sizning akkauntingiz bloklangan' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    // Get profile data
    let profile = null;
    if (user.role === 'pharmacy') {
      const profileResult = await pool.query('SELECT * FROM pharmacies WHERE user_id = $1', [user.id]);
      profile = profileResult.rows[0] || null;
    } else if (user.role === 'distributor') {
      const profileResult = await pool.query('SELECT * FROM distributors WHERE user_id = $1', [user.id]);
      profile = profileResult.rows[0] || null;
    }

    res.json({
      user: { id: user.id, email: user.email, role: user.role, status: user.status },
      profile,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    let profile = null;
    if (req.user.role === 'pharmacy') {
      const result = await pool.query('SELECT * FROM pharmacies WHERE user_id = $1', [req.user.id]);
      profile = result.rows[0] || null;
    } else if (req.user.role === 'distributor') {
      const result = await pool.query('SELECT * FROM distributors WHERE user_id = $1', [req.user.id]);
      profile = result.rows[0] || null;
    }

    res.json({ user: req.user, profile });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Emergency admin unblock (secret recovery endpoint)
// Use: POST /api/auth/emergency-unblock with { secret, email }
router.post('/emergency-unblock', async (req, res) => {
  try {
    const { secret, email } = req.body;

    // Secret key must match env variable (set your own!)
    const RECOVERY_SECRET = process.env.RECOVERY_SECRET || 'buloqprice-recovery-2024';

    if (secret !== RECOVERY_SECRET) {
      return res.status(403).json({ error: 'Noto\'g\'ri maxfiy kalit' });
    }

    const result = await pool.query(
      "UPDATE users SET status = 'approved', updated_at = NOW() WHERE email = $1 AND role = 'admin' RETURNING id, email, status",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin topilmadi' });
    }

    res.json({ message: 'Admin blokdan chiqarildi!', user: result.rows[0] });
  } catch (err) {
    console.error('Emergency unblock error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
