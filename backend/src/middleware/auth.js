const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Avtorizatsiya tokeni topilmadi' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query('SELECT id, email, role, status FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    }

    const user = result.rows[0];
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Sizning akkauntingiz bloklangan' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token muddati tugagan' });
    }
    return res.status(401).json({ error: 'Noto\'g\'ri token' });
  }
};

// Check if user is approved
const requireApproved = (req, res, next) => {
  if (req.user.status !== 'approved') {
    return res.status(403).json({ error: 'Sizning akkauntingiz hali tasdiqlanmagan' });
  }
  next();
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sizda bu amalni bajarish huquqi yo\'q' });
    }
    next();
  };
};

module.exports = { authenticate, requireApproved, authorize };
