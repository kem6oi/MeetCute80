const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

router.use(authMiddleware, adminMiddleware);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await pool.query('SELECT id, email, role, is_active, created_at FROM users');
    res.json(users.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user status
router.put('/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    await pool.query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, id]);
    res.json({ message: 'User status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;