const pool = require('../config/db');

class Subscription {
  static async getAllPackages() {
    const result = await pool.query(`
      SELECT 
        p.*,
        json_agg(json_build_object(
          'id', f.id,
          'name', f.feature_name,
          'description', f.feature_description
        )) as features
      FROM subscription_packages p
      LEFT JOIN subscription_features f ON p.id = f.package_id
      WHERE p.is_active = true
      GROUP BY p.id
      ORDER BY p.price ASC
    `);
    return result.rows;
  }

  static async getPackageById(id) {
    const result = await pool.query(`
      SELECT 
        p.*,
        json_agg(json_build_object(
          'id', f.id,
          'name', f.feature_name,
          'description', f.feature_description
        )) as features
      FROM subscription_packages p
      LEFT JOIN subscription_features f ON p.id = f.package_id
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);
    return result.rows[0];
  }

  static async createPackage({ name, price, billing_interval = 'monthly', features = [] }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create package
      const packageResult = await client.query(`
        INSERT INTO subscription_packages (name, price, billing_interval)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [name, price, billing_interval]);

      const package_id = packageResult.rows[0].id;

      // Add features
      if (features.length > 0) {
        const featureValues = features.map(f => 
          `(${package_id}, ${f.name}, ${f.description})`
        ).join(',');

        await client.query(`
          INSERT INTO subscription_features (package_id, feature_name, feature_description)
          VALUES ${featureValues}
        `);
      }

      await client.query('COMMIT');
      return packageResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async updatePackage(id, { name, price, billing_interval, is_active, features }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update package
      const packageResult = await client.query(`
        UPDATE subscription_packages
        SET name = COALESCE($1, name),
            price = COALESCE($2, price),
            billing_interval = COALESCE($3, billing_interval),
            is_active = COALESCE($4, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [name, price, billing_interval, is_active, id]);

      // Update features if provided
      if (features) {
        // Delete existing features
        await client.query('DELETE FROM subscription_features WHERE package_id = $1', [id]);

        // Add new features
        if (features.length > 0) {
          const featureValues = features.map(f => 
            `(${id}, ${f.name}, ${f.description})`
          ).join(',');

          await client.query(`
            INSERT INTO subscription_features (package_id, feature_name, feature_description)
            VALUES ${featureValues}
          `);
        }
      }

      await client.query('COMMIT');
      return packageResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getUserSubscription(userId) {
    const result = await pool.query(`
      SELECT 
        s.*,
        p.name as package_name,
        p.price,
        p.billing_interval
      FROM user_subscriptions s
      JOIN subscription_packages p ON s.package_id = p.id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId]);
    return result.rows[0];
  }

  static async createUserSubscription({ userId, packageId, paymentMethodId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get package details
      const packageResult = await client.query(
        'SELECT * FROM subscription_packages WHERE id = $1',
        [packageId]
      );
      const pkg = packageResult.rows[0];

      // Calculate end date based on billing interval
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // Default to 1 month

      // Create subscription
      const subscriptionResult = await client.query(`
        INSERT INTO user_subscriptions (
          user_id, package_id, status, end_date, payment_method_id
        )
        VALUES ($1, $2, 'active', $3, $4)
        RETURNING *
      `, [userId, packageId, endDate, paymentMethodId]);

      // Create transaction record
      await client.query(`
        INSERT INTO subscription_transactions (
          subscription_id, amount, status, payment_method
        )
        VALUES ($1, $2, 'completed', $3)
      `, [
        subscriptionResult.rows[0].id,
        pkg.price,
        'credit_card' // You might want to make this dynamic
      ]);

      // Update user role
      await client.query(`
        UPDATE users
        SET role = $1
        WHERE id = $2
      `, [pkg.name.toLowerCase(), userId]);

      await client.query('COMMIT');
      return subscriptionResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async cancelSubscription(subscriptionId) {
    const result = await pool.query(`
      UPDATE user_subscriptions
      SET status = 'cancelled',
          auto_renew = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [subscriptionId]);
    return result.rows[0];
  }
}

module.exports = Subscription; 