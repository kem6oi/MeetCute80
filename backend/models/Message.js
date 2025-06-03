const pool = require('../config/db');

class Message {
  static async create({ senderId, recipientId, content }) {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [senderId, recipientId, content]
    );
    return result.rows[0];
  }

  static async getConversation(userId, recipientId) {
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND recipient_id = $2)
       OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at ASC`,
      [userId, recipientId]
    );
    return result.rows;
  }

  static async getConversations(userId) {
    const result = await pool.query(
      `WITH ranked_messages AS (
        SELECT 
          m.*,
          ROW_NUMBER() OVER (
            PARTITION BY 
              CASE 
                WHEN m.sender_id = $1 THEN m.recipient_id 
                ELSE m.sender_id 
              END 
            ORDER BY m.created_at DESC
          ) as rn
        FROM messages m
        WHERE m.sender_id = $1 OR m.recipient_id = $1
      )
      SELECT 
        u.id as user_id,
        p.first_name,
        p.last_name,
        rm.content as last_message,
        COUNT(CASE WHEN m.read = false AND m.sender_id = u.id THEN 1 END) as unread_count
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      JOIN ranked_messages rm ON (
        (rm.sender_id = u.id AND rm.recipient_id = $1) OR
        (rm.sender_id = $1 AND rm.recipient_id = u.id)
      ) AND rm.rn = 1
      LEFT JOIN messages m ON (
        (m.sender_id = u.id AND m.recipient_id = $1 AND m.read = false) OR
        (m.sender_id = $1 AND m.recipient_id = u.id)
      )
      WHERE u.id != $1
      GROUP BY u.id, p.first_name, p.last_name, rm.content
      ORDER BY MAX(rm.created_at) DESC`,
      [userId]
    );
    return result.rows;
  }

  static async markAsRead(userId, senderId) {
    await pool.query(
      `UPDATE messages SET read = true 
       WHERE recipient_id = $1 AND sender_id = $2 AND read = false`,
      [userId, senderId]
    );
  }
}

module.exports = Message;