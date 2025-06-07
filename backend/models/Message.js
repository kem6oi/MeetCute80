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
      `SELECT id, sender_id, recipient_id, content, created_at, read, read_at
       FROM messages
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
          m.id, m.sender_id, m.recipient_id, m.content, m.created_at, m.read, m.read_at,
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
        rm.sender_id as last_message_sender_id,
        rm.read_at as last_message_read_at,
        rm.created_at as last_message_created_at, -- for ordering
        COUNT(CASE WHEN m_unread.read = false AND m_unread.sender_id = u.id THEN 1 END) as unread_count
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      JOIN ranked_messages rm ON (
        (rm.sender_id = u.id AND rm.recipient_id = $1) OR
        (rm.sender_id = $1 AND rm.recipient_id = u.id)
      ) AND rm.rn = 1
      LEFT JOIN messages m_unread ON (
        (m_unread.sender_id = u.id AND m_unread.recipient_id = $1 AND m_unread.read = false)
        -- This join condition for unread_count might need to be specific to count messages FROM the other user TO the current user ($1)
        -- The original query for unread_count seemed to count messages sent BY the other user (u.id) that are unread.
        -- Let's assume it means messages *received by $1 from u.id* that are unread by $1.
        -- The original logic for unread_count: COUNT(CASE WHEN m.read = false AND m.sender_id = u.id THEN 1 END)
        -- This counts unread messages sent by the *other user in the conversation list (u.id)* to the *logged-in user ($1)*.
        -- This seems correct for displaying "X unread messages from this user".
      )
      WHERE u.id != $1
      GROUP BY u.id, p.first_name, p.last_name, rm.content, rm.sender_id, rm.read_at, rm.created_at
      ORDER BY last_message_created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async markAsRead(recipientId, senderId) {
    await pool.query(
      `UPDATE messages SET read = true, read_at = CURRENT_TIMESTAMP
       WHERE recipient_id = $1 AND sender_id = $2 AND read = false`,
      [recipientId, senderId]
    );
  }
}

module.exports = Message;