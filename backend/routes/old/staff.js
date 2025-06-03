const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const pool = require('../config/db');

// Staff middleware (role must be staff or admin)
const staffMiddleware = (req, res, next) => {
  if (!['staff', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Staff access required' });
  }
  next();
};

router.use(authMiddleware, staffMiddleware);

// Get all tickets
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await pool.query(`
      SELECT t.*, u.email as user_email 
      FROM tickets t
      JOIN users u ON t.user_id = u.id
    `);
    res.json(tickets.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update ticket status
router.put('/tickets/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query(
      'UPDATE tickets SET status = $1, assigned_to = $2 WHERE id = $3',
      [status, req.user.id, id]
    );
    res.json({ message: 'Ticket updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;