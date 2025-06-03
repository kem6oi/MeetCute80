const pool = require('../config/db');

class Subscription {
  static async getAllPackages() {
    const packagesResult = await pool.query(`
      SELECT id, name, price, billing_interval, tier_level, description, duration_months
      FROM subscription_packages
      WHERE is_active = true
      ORDER BY price ASC
    `);

    const packages = packagesResult.rows;

    // For each package, get its features based on its tier_level
    const packagesWithFeatures = await Promise.all(
      packages.map(async (pkg) => {
        const featuresResult = await pool.query(`
          SELECT feature_name, feature_description
          FROM subscription_features
          WHERE tier_level = $1
        `, [pkg.tier_level]);
        return {
          ...pkg,
          features: featuresResult.rows.map(f => ({ name: f.feature_name, description: f.feature_description })),
        };
      })
    );

    return packagesWithFeatures;
  }

  static async getPackageById(id) {
    const packageResult = await pool.query(`
      SELECT id, name, price, billing_interval, tier_level, description, duration_months
      FROM subscription_packages
      WHERE id = $1
    `, [id]);

    const pkg = packageResult.rows[0];

    if (!pkg) {
      return null;
    }

    // Get its features based on its tier_level
    const featuresResult = await pool.query(`
      SELECT feature_name, feature_description
      FROM subscription_features
      WHERE tier_level = $1
    `, [pkg.tier_level]);

    return {
      ...pkg,
      features: featuresResult.rows.map(f => ({ name: f.feature_name, description: f.feature_description })),
    };
  }

  static async createPackage({ name, price, billing_interval = 'monthly', tier_level, description, duration_months }) {
    // Features are no longer managed directly with package creation, they are linked by tier_level
    const packageResult = await pool.query(`
      INSERT INTO subscription_packages (name, price, billing_interval, tier_level, description, duration_months)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, price, billing_interval, tier_level, description, duration_months]);

    // Since features are global per tier, no specific feature insertion here.
    // We might want to return the package with its features, similar to getPackageById
    if (packageResult.rows[0]) {
        const newPackage = packageResult.rows[0];
        const featuresResult = await pool.query(`
            SELECT feature_name, feature_description
            FROM subscription_features
            WHERE tier_level = $1
        `, [newPackage.tier_level]);
        return {
            ...newPackage,
            features: featuresResult.rows.map(f => ({ name: f.feature_name, description: f.feature_description }))
        };
    }
    return null; // Should not happen if insert was successful
  }

  static async updatePackage(id, { name, price, billing_interval, is_active, tier_level, description, duration_months }) {
    // Features are no longer managed directly with package update, they are linked by tier_level
    const packageResult = await pool.query(`
      UPDATE subscription_packages
      SET name = COALESCE($1, name),
          price = COALESCE($2, price),
          billing_interval = COALESCE($3, billing_interval),
          is_active = COALESCE($4, is_active),
          tier_level = COALESCE($5, tier_level),
          description = COALESCE($6, description),
          duration_months = COALESCE($7, duration_months),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [name, price, billing_interval, is_active, tier_level, description, duration_months, id]);

    // Similar to createPackage, we might want to return the updated package with its new set of features
     if (packageResult.rows[0]) {
        const updatedPackage = packageResult.rows[0];
        const featuresResult = await pool.query(`
            SELECT feature_name, feature_description
            FROM subscription_features
            WHERE tier_level = $1
        `, [updatedPackage.tier_level]);
        return {
            ...updatedPackage,
            features: featuresResult.rows.map(f => ({ name: f.feature_name, description: f.feature_description }))
        };
    }
    return null; // Or throw error if package not found
  }

  static async getUserSubscription(userId) {
    const result = await pool.query(`
      SELECT 
        s.*,
        p.name as package_name,
        p.price,
        p.billing_interval,
        p.tier_level -- Added tier_level here
      FROM user_subscriptions s
      JOIN subscription_packages p ON s.package_id = p.id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId]);

    const subscription = result.rows[0];

    if (!subscription) {
        return null;
    }

    // Fetch features for the subscription's tier_level
    const featuresResult = await pool.query(`
        SELECT feature_name, feature_description
        FROM subscription_features
        WHERE tier_level = $1
    `, [subscription.tier_level]);

    return {
        ...subscription,
        features: featuresResult.rows.map(f => ({ name: f.feature_name, description: f.feature_description }))
    };
  }

  static async createUserSubscription({ userId, packageId, paymentMethodId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get package details
      const packageResult = await client.query(
        'SELECT id, name, price, billing_interval, tier_level, duration_months FROM subscription_packages WHERE id = $1', // Added tier_level, duration_months
        [packageId]
      );
      const pkg = packageResult.rows[0];

      if (!pkg) {
        throw new Error('Package not found');
      }

      // Calculate end date based on package's duration_months or billing interval
      const endDate = new Date();
      if (pkg.duration_months) {
        endDate.setMonth(endDate.getMonth() + pkg.duration_months);
      } else if (pkg.billing_interval === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (pkg.billing_interval === 'annually' || pkg.billing_interval === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1); // Default fallback
      }


      // Create subscription
      const subscriptionResult = await client.query(`
        INSERT INTO user_subscriptions (
          user_id, package_id, status, end_date, payment_method_id, auto_renew
        )
        VALUES ($1, $2, 'pending_verification', $3, $4, true)
        RETURNING *
      `, [userId, packageId, endDate, paymentMethodId]);

      // Create transaction record
      await client.query(`
        INSERT INTO subscription_transactions (
          subscription_id, amount, status, payment_method
        )
        VALUES ($1, $2, 'pending_verification', $3)
      `, [
        subscriptionResult.rows[0].id,
        pkg.price,
        paymentMethodId || 'default_payment_method' // Use provided or a default
      ]);

      // Update user role based on tier_level
      if (pkg.tier_level) { // Ensure tier_level is available
        await client.query(`
          UPDATE users
          SET role = $1
          WHERE id = $2
        `, [pkg.tier_level.toLowerCase(), userId]);
      }

      await client.query('COMMIT');
      // Return the subscription along with its features
      const newSubscription = subscriptionResult.rows[0];
      const featuresResult = await pool.query(`
            SELECT feature_name, feature_description
            FROM subscription_features
            WHERE tier_level = $1
      `, [pkg.tier_level]);

      return {
          ...newSubscription,
          package_details: pkg, // include package details for context
          features: featuresResult.rows.map(f => ({ name: f.feature_name, description: f.feature_description }))
      };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async cancelSubscription(subscriptionId) {
    // Fetch the subscription to get user_id and potentially current role/tier for logging or other actions if needed
    const currentSubscriptionResult = await pool.query(
        `SELECT us.id, us.user_id, us.status, sp.tier_level
         FROM user_subscriptions us
         JOIN subscription_packages sp ON us.package_id = sp.id
         WHERE us.id = $1`, [subscriptionId]);

    if (!currentSubscriptionResult.rows.length) {
        throw new Error('Subscription not found.');
    }
    const currentSubscription = currentSubscriptionResult.rows[0];

    // Prevent cancelling already cancelled or non-active subscriptions if desired
    if (currentSubscription.status !== 'active') {
        // Or return current state, or throw error, depending on desired behavior
        // For now, we allow proceeding to ensure it's marked as cancelled and auto_renew is false
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(`
          UPDATE user_subscriptions
          SET status = 'cancelled',
              auto_renew = false,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `, [subscriptionId]);

        // Potentially revert user role to a default role, e.g., 'user'
        // This depends on business logic: does cancelling a subscription immediately revert role?
        // Or does it revert when the current subscription period (end_date) is reached?
        // For this example, let's assume role is reverted to 'user' upon cancellation.
        // This might need adjustment if the user has other active subscriptions or a base role.
        // A more complex role management might be needed.
        // For now, if the cancelled subscription was 'elite' or 'premium', set to 'basic' or 'user'.
        // Let's assume 'Basic' is the lowest tier that still has a role, otherwise 'user'.
        // This logic needs to be robust based on actual tier_levels and role names.
        if (currentSubscription.tier_level && (currentSubscription.tier_level.toLowerCase() === 'elite' || currentSubscription.tier_level.toLowerCase() === 'premium')) {
            // Check if user has other active higher-tier subscriptions before downgrading role
            const otherActiveSubs = await client.query(`
                SELECT sp.tier_level
                FROM user_subscriptions us
                JOIN subscription_packages sp ON us.package_id = sp.id
                WHERE us.user_id = $1 AND us.status = 'active' AND us.id != $2
                ORDER BY sp.price DESC
                LIMIT 1;
            `, [currentSubscription.user_id, subscriptionId]);

            if (otherActiveSubs.rows.length > 0) {
                // User has other active subscriptions, set role to the highest active one
                await client.query('UPDATE users SET role = $1 WHERE id = $2', [otherActiveSubs.rows[0].tier_level.toLowerCase(), currentSubscription.user_id]);
            } else {
                // No other active subscriptions, downgrade to a base role, e.g., 'user' or 'basic'
                // This depends on how 'Basic' tier maps to roles. If 'Basic' is a role, use it.
                // For now, let's assume 'user' is the default non-subscriber role.
                await client.query('UPDATE users SET role = $1 WHERE id = $2', ['user', currentSubscription.user_id]);
            }
        } else if (!currentSubscription.tier_level) {
            // If for some reason tier_level was not on the subscription, ensure a base role
             await client.query('UPDATE users SET role = $1 WHERE id = $2', ['user', currentSubscription.user_id]);
        }


        await client.query('COMMIT');
        return result.rows[0];

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
  }
}

module.exports = Subscription; 