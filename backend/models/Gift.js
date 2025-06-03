const pool = require('../config/db');

class Gift {
  // Gift Items Methods
  static async getAllGiftItems() {
    const result = await pool.query(
      'SELECT * FROM gift_items WHERE is_available = TRUE ORDER BY price ASC'
    );
    return result.rows;
  }

  static async getGiftItemById(id) {
    const result = await pool.query(
      'SELECT * FROM gift_items WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async createGiftItem({ name, description, price, imageUrl, category }) {
    const result = await pool.query(
      `INSERT INTO gift_items (name, description, price, image_url, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, price, imageUrl, category]
    );
    return result.rows[0];
  }

  static async updateGiftItem(id, { name, description, price, imageUrl, category, isAvailable }) {
    const result = await pool.query(
      `UPDATE gift_items 
       SET name = $1, description = $2, price = $3, image_url = $4, 
           category = $5, is_available = $6
       WHERE id = $7
       RETURNING *`,
      [name, description, price, imageUrl, category, isAvailable, id]
    );
    return result.rows[0];
  }

  // User Gifts Methods
  static async sendGift({ senderId, recipientId, giftItemId, message, isAnonymous }) {
    const result = await pool.query(
      `INSERT INTO user_gifts 
       (sender_id, recipient_id, gift_item_id, message, is_anonymous)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [senderId, recipientId, giftItemId, message, isAnonymous]
    );
    return result.rows[0];
  }

  static async getReceivedGifts(userId) {
    const result = await pool.query(
      `SELECT ug.*, gi.*, 
        CASE WHEN ug.is_anonymous THEN NULL ELSE u.id END as sender_id,
        CASE WHEN ug.is_anonymous THEN 'Anonymous' ELSE p.first_name || ' ' || p.last_name END as sender_name,
        CASE WHEN ug.is_anonymous THEN NULL ELSE p.profile_pic END as sender_profile_pic
       FROM user_gifts ug
       JOIN gift_items gi ON ug.gift_item_id = gi.id
       LEFT JOIN users u ON ug.sender_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE ug.recipient_id = $1
       ORDER BY ug.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async getSentGifts(userId) {
    const result = await pool.query(
      `SELECT ug.*, gi.*, 
        p.first_name || ' ' || p.last_name as recipient_name,
        p.profile_pic as recipient_profile_pic
       FROM user_gifts ug
       JOIN gift_items gi ON ug.gift_item_id = gi.id
       JOIN profiles p ON ug.recipient_id = p.user_id
       WHERE ug.sender_id = $1
       ORDER BY ug.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async markGiftAsRead(giftId, userId) {
    const result = await pool.query(
      `UPDATE user_gifts 
       SET is_read = TRUE
       WHERE id = $1 AND recipient_id = $2
       RETURNING *`,
      [giftId, userId]
    );
    return result.rows[0];
  }

  static async getUnreadGiftCount(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM user_gifts WHERE recipient_id = $1 AND is_read = FALSE',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = Gift; 