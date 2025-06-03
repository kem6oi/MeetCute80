const pool = require('../config/db');

class Profile {
  static async updateProfilePicture(userId, pictureUrl) {
    const result = await pool.query(
      `UPDATE profiles
       SET profile_picture = $1
       WHERE user_id = $2
       RETURNING *`,
      [pictureUrl, userId]
    );
    return result.rows[0];
  }

  static async createOrUpdate({ userId, firstName, lastName, dob, gender, bio }) {
    const result = await pool.query(
      `INSERT INTO profiles (user_id, first_name, last_name, dob, gender, bio)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE
       SET first_name = $2, last_name = $3, dob = $4, gender = $5, bio = $6
       RETURNING *`,
      [userId, firstName, lastName, dob, gender, bio]
    );
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await pool.query(
      `SELECT p.*, u.email 
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1`,
      [userId]
    );
    
    // Just return the existing profile or null if not found
    // No longer attempting to create a default profile with missing required fields
    return result.rows[0] || null;
  }

  static async getPotentialMatches(userId, limit = 20) {
    // Get profiles that:
    // 1. Are not the current user
    // 2. Have not been liked by the current user
    // 3. Are active users
    // 4. Are not admin users
    // 5. Have complete profiles
    // 6. Are not already matched with current user
    // 7. Have not been liked by other users (to hide users who liked current user)
    const result = await pool.query(
      `SELECT p.*, u.id as user_id 
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE u.id != $1 
         AND u.is_active = true
         AND u.role != 'admin'
         AND u.profile_complete = true
         AND NOT EXISTS (
           SELECT 1 FROM likes 
           WHERE user_id = $1 AND liked_user_id = u.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM likes
           WHERE user_id = u.id AND liked_user_id = $1
         )
         AND NOT EXISTS (
           SELECT 1 FROM matches 
           WHERE (user1_id = $1 AND user2_id = u.id) OR (user1_id = u.id AND user2_id = $1)
         )
       ORDER BY RANDOM() LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }
}

module.exports = Profile;