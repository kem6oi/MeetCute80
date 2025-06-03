const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const pool = require('../config/db');

// Create/Update profile
router.post('/', authMiddleware, async (req, res) => {
  const { first_name, last_name, dob, gender, bio } = req.body;
  try {
    await pool.query(
      `INSERT INTO profiles (user_id, first_name, last_name, dob, gender, bio)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE
       SET first_name = $2, last_name = $3, dob = $4, gender = $5, bio = $6`,
      [req.user.id, first_name, last_name, dob, gender, bio]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user profile
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const profile = await pool.query(
      `SELECT p.*, u.email 
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1`,
      [req.params.id]
    );
    res.json(profile.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;