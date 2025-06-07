const pool = require('../config/db');
const UserBalance = require('./UserBalance');

class Gift {
  // Tier hierarchy for gift sending permissions
  static TIER_HIERARCHY = {
    'Basic': 1,
    'Premium': 2,
    'Elite': 3,
  };

  // Gift Items Methods
  static async getAllGiftItems() {
    const result = await pool.query(
      'SELECT id, name, description, price, image_url, category, is_available, required_tier_level FROM gift_items WHERE is_available = TRUE ORDER BY price ASC'
    );
    return result.rows;
  }

  static async getGiftItemById(id) {
    const result = await pool.query(
      'SELECT id, name, description, price, image_url, category, is_available, required_tier_level FROM gift_items WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async createGiftItem({ name, description, price, imageUrl, category, required_tier_level }) {
    const result = await pool.query(
      `INSERT INTO gift_items (name, description, price, image_url, category, required_tier_level)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, price, imageUrl, category, required_tier_level]
    );
    return result.rows[0];
  }

  static async updateGiftItem(id, { name, description, price, imageUrl, category, isAvailable, required_tier_level }) {
    const result = await pool.query(
      `UPDATE gift_items 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           image_url = COALESCE($4, image_url),
           category = COALESCE($5, category),
           is_available = COALESCE($6, is_available),
           required_tier_level = COALESCE($7, required_tier_level)
       WHERE id = $8
       RETURNING *`,
      [name, description, price, imageUrl, category, isAvailable, required_tier_level, id]
    );
    return result.rows[0];
  }

  // User Gifts Methods
  static async sendGift({ senderId, recipientId, giftItemId, message, isAnonymous, useSiteBalance = false }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch sender's tier
      const senderTierResult = await client.query(
        `SELECT sp.tier_level
         FROM user_subscriptions us
         JOIN subscription_packages sp ON us.package_id = sp.id
         WHERE us.user_id = $1 AND us.status = 'active'
         ORDER BY sp.price DESC
         LIMIT 1`,
        [senderId]
      );

      const senderTier = senderTierResult.rows[0]?.tier_level || 'Basic'; // Default to Basic if no active sub

      // 2. Fetch gift item details (price and required_tier_level)
      const giftItemResult = await client.query(
        'SELECT price, required_tier_level FROM gift_items WHERE id = $1 AND is_available = TRUE',
        [giftItemId]
      );

      if (giftItemResult.rows.length === 0) {
        throw new Error('Gift item not found or is unavailable.');
      }
      const giftItem = giftItemResult.rows[0];

      // 3. Tier Check
      const senderTierValue = this.TIER_HIERARCHY[senderTier] || 0;
      const requiredTierValue = this.TIER_HIERARCHY[giftItem.required_tier_level] || 0;

      if (giftItem.required_tier_level && senderTierValue < requiredTierValue) {
        // Using a specific error code/name could be useful for frontend handling
        const error = new Error(`Your subscription tier (${senderTier}) is not sufficient to send this gift (requires ${giftItem.required_tier_level}).`);
        error.code = 'INSUFFICIENT_TIER';
        throw error;
      }

      // 4. Insert into user_gifts
      const userGiftResult = await client.query(
        `INSERT INTO user_gifts
         (sender_id, recipient_id, gift_item_id, message, is_anonymous, original_purchase_price)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [senderId, recipientId, giftItemId, message, isAnonymous, giftItem.price]
      );
      const createdUserGift = userGiftResult.rows[0];

      // 5. Handle transaction recording based on useSiteBalance
      if (useSiteBalance) {
        // Debit from site balance
        await UserBalance.debit(senderId, parseFloat(giftItem.price), client);
        // Record transaction as paid with site balance
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, status, item_category, payable_item_id, payment_method_details)
           VALUES ($1, $2, $3, 'completed', 'gift', $4, $5)`,
          [senderId, 'gift_site_balance', giftItem.price, giftItemId, 'Paid with site balance']
        );
      } else {
        // TODO: Implement actual payment gateway logic here for real money transactions.
        // For now, it logs as 'gift' and 'completed' as before, implying direct successful payment.
        // In a real scenario, this might be 'pending_payment' until webhook confirmation.
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, status, item_category, payable_item_id)
           VALUES ($1, 'gift', $2, 'completed', 'gift', $3)`,
          [senderId, giftItem.price, giftItemId]
        );
      }

      await client.query('COMMIT');
      return createdUserGift;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in sendGift transaction:', error);
      throw error; // Re-throw to be caught by controller
    } finally {
      client.release();
    }
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

  static async redeemGift(userGiftId, userId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch the user_gift and ensure it belongs to the user and is not redeemed
        const giftResult = await client.query(
            `SELECT ug.*, gi.name as gift_item_name
             FROM user_gifts ug
             JOIN gift_items gi ON ug.gift_item_id = gi.id
             WHERE ug.id = $1 AND ug.recipient_id = $2 FOR UPDATE`,
            [userGiftId, userId]
        );
        const userGift = giftResult.rows[0];

        if (!userGift) {
            throw new Error('Gift not found or does not belong to the user.');
        }
        if (userGift.is_redeemed) {
            throw new Error('Gift has already been redeemed.');
        }
        if (userGift.original_purchase_price == null) {
            // This case should ideally not happen if sendGift is updated correctly
            console.error(`Attempted to redeem gift ${userGiftId} with null original_purchase_price.`);
            throw new Error('Cannot redeem gift: original purchase price not recorded.');
        }

        // 2. Calculate redeemed_value (73%)
        const originalPrice = parseFloat(userGift.original_purchase_price);
        const redeemedValue = parseFloat((originalPrice * 0.73).toFixed(2));

        // 3. Update user_gifts table
        const updatedGiftResult = await client.query(
            `UPDATE user_gifts
             SET is_redeemed = TRUE, redeemed_at = CURRENT_TIMESTAMP, redeemed_value = $1
             WHERE id = $2
             RETURNING *`,
            [redeemedValue, userGiftId]
        );
        const updatedGift = updatedGiftResult.rows[0];


        // 4. Credit user's balance
        const updatedBalance = await UserBalance.credit(userId, redeemedValue, client);

        // 5. TODO: Log this balance transaction for auditing (e.g., in a new balance_transactions table)
        // For now, console.log for tracing
        console.log(`User ${userId} redeemed gift ${userGift.id} (item: ${userGift.gift_item_name}) for ${redeemedValue}. New balance: ${updatedBalance.balance}`);

        await client.query('COMMIT');
        return {
            redeemedGift: updatedGift,
            newBalance: updatedBalance.balance
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in redeemGift transaction:', error.message, error.stack);
        throw error;
    } finally {
        client.release();
    }
  }
}

module.exports = Gift; 