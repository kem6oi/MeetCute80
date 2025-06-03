const pool = require('../config/db');

class User {
  static async create({ email, password, role = 'user', phone = null, country_id = null }) {
    const result = await pool.query(
      `INSERT INTO users (email, password, role, phone, country_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [email, password, role, phone, country_id]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async updateStatus(id, isActive) {
    await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2',
      [isActive, id]
    );
  }

  static async updateProfileComplete(id, complete = true) {
    await pool.query(
      'UPDATE users SET profile_complete = $1 WHERE id = $2',
      [complete, id]
    );
  }

  static async suspendUser(id, reason) {
    const result = await pool.query(
      `UPDATE users 
       SET is_suspended = true, 
           suspension_reason = $2,
           suspended_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, reason]
    );
    return result.rows[0];
  }

  static async unsuspendUser(id) {
    const result = await pool.query(
      `UPDATE users 
       SET is_suspended = false, 
           suspension_reason = NULL,
           suspended_at = NULL
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = User;