const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const pool = require('../config/db');

// Get message history between two users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { recipientId } = req.query;
    const { rows } = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND recipient_id = $2)
       OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at ASC`,
      [req.user.id, recipientId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all conversations for a user
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (u.id)
        u.id as user_id,
        p.first_name,
        p.last_name,
        m.content as last_message,
        m.created_at as last_message_time,
        COUNT(CASE WHEN m.read = false AND m.sender_id = u.id THEN 1 END) as unread_count
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      JOIN messages m ON (
        (m.sender_id = u.id AND m.recipient_id = $1) OR
        (m.sender_id = $1 AND m.recipient_id = u.id)
      WHERE u.id != $1
      GROUP BY u.id, p.first_name, p.last_name, m.content, m.created_at
      ORDER BY u.id, m.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark messages as read
router.put('/read', authMiddleware, async (req, res) => {
  try {
    const { senderId } = req.body;
    await pool.query(
      `UPDATE messages SET read = true 
       WHERE recipient_id = $1 AND sender_id = $2 AND read = false`,
      [req.user.id, senderId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;