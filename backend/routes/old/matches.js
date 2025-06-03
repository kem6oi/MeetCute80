const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const pool = require('../config/db');

// Get potential matches
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, u.id as user_id 
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      WHERE u.id != $1 AND u.is_active = true
      ORDER BY RANDOM() LIMIT 20
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like a profile
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    await pool.query('BEGIN');
    
    // Record the like
    await pool.query(
      `INSERT INTO likes (user_id, liked_user_id) VALUES ($1, $2)`,
      [req.user.id, req.params.id]
    );

    // Check for mutual like
    const { rows } = await pool.query(
      `SELECT 1 FROM likes WHERE user_id = $1 AND liked_user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (rows.length > 0) {
      // Create a match if mutual like exists
      await pool.query(
        `INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2)`,
        [req.user.id, req.params.id]
      );
      await pool.query('COMMIT');
      return res.json({ match: true });
    }

    await pool.query('COMMIT');
    res.json({ match: false });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;