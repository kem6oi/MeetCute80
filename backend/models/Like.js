const pool = require('../config/db');

class Like {
  static async createLike(userId, likedUserId) {
    const result = await pool.query(
      `INSERT INTO likes (user_id, liked_user_id)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, likedUserId]
    );
    return result.rows[0];
  }

  static async checkLike(userId, likedUserId) {
    const result = await pool.query(
      `SELECT * FROM likes 
       WHERE user_id = $1 AND liked_user_id = $2`,
      [userId, likedUserId]
    );
    return result.rows[0];
  }

  static async deleteLike(userId, likedUserId) {
    const result = await pool.query(
      `DELETE FROM likes 
       WHERE user_id = $1 AND liked_user_id = $2
       RETURNING *`,
      [userId, likedUserId]
    );
    return result.rows[0];
  }
}

module.exports = Like; 