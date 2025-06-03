const pool = require('../config/db');
const PaymentMethod = require('./PaymentMethod'); // To fetch payment instructions

class Transaction {
    /**
     * Initiates a new transaction.
     * @param {Object} details - The details for initiating the transaction.
     * @param {number} details.userId - The ID of the user initiating.
     * @param {number} details.countryId - The ID of the country for payment method.
     * @param {number} details.paymentMethodTypeId - The ID of the global payment method type selected.
     * @param {number} details.amount - The amount for the transaction.
     * @param {string} details.currency - The currency code (e.g., 'USD', 'KES').
     * @param {string} details.itemCategory - The category of item being purchased (e.g., 'subscription', 'gift').
     * @param {number} details.payableItemId - The ID of the specific item (e.g., subscription_package_id).
     * @returns {Promise<Object>} The newly created transaction record along with payment instructions.
     * @throws {Error} If the payment method is not configured for the country or other issues.
     */
    static async initiate({
        userId,
        countryId,
        paymentMethodTypeId,
        amount,
        currency,
        itemCategory,
        payableItemId
    }) {
        // 1. Verify the selected payment method is configured for the country and get its details
        const paymentConfig = await PaymentMethod.getCountryPaymentMethodDetail(countryId, paymentMethodTypeId);
        if (!paymentConfig || !paymentConfig.is_active) {
            throw new Error('Selected payment method is not available or not configured for this country.');
        }

        // 2. Create the transaction record
        const transactionQuery = `
            INSERT INTO transactions (
                user_id, payment_country_id, payment_method_type_id, amount, currency,
                item_category, payable_item_id, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_payment')
            RETURNING *;
        `;
        const transactionResult = await pool.query(transactionQuery, [
            userId,
            countryId,
            paymentMethodTypeId,
            amount,
            currency,
            itemCategory,
            payableItemId
        ]);

        const newTransaction = transactionResult.rows[0];

        return {
            transaction: newTransaction,
            paymentInstructions: paymentConfig.user_instructions,
            paymentConfigurationDetails: paymentConfig.configuration_details // e.g., PayBill, PayPal email, BTC address
        };
    }

    /**
     * Submits a payment reference for a transaction.
     * @param {Object} details - Details for submitting the reference.
     * @param {number} details.transactionId - The ID of the transaction.
     * @param {number} details.userId - The ID of the user submitting (for verification).
     * @param {string} details.userProvidedReference - The payment reference from the user.
     * @returns {Promise<Object>} The updated transaction record.
     * @throws {Error} If transaction not found, not owned by user, or not in correct state.
     */
    static async submitReference({ transactionId, userId, userProvidedReference }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Fetch the transaction and verify ownership and status
            const currentTransactionResult = await client.query(
                'SELECT * FROM transactions WHERE id = $1 AND user_id = $2 FOR UPDATE',
                [transactionId, userId]
            );
            const currentTransaction = currentTransactionResult.rows[0];

            if (!currentTransaction) {
                throw new Error('Transaction not found or access denied.');
            }
            if (currentTransaction.status !== 'pending_payment') {
                throw new Error(`Transaction is not awaiting payment reference (status: ${currentTransaction.status}).`);
            }

            // 2. Update the transaction
            const updateQuery = `
                UPDATE transactions
                SET user_provided_reference = $1,
                    status = 'pending_verification',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *;
            `;
            const updatedTransactionResult = await client.query(updateQuery, [userProvidedReference, transactionId]);

            await client.query('COMMIT');
            return updatedTransactionResult.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get a transaction by its ID, ensuring it belongs to the specified user.
     * @param {number} transactionId - The ID of the transaction.
     * @param {number} userId - The ID of the user.
     * @returns {Promise<Object|null>} The transaction object or null.
     */
    static async getByIdForUser(transactionId, userId) {
        const result = await pool.query(
            'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
            [transactionId, userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get a transaction by its ID (general purpose, typically for admin).
     * @param {number} transactionId - The ID of the transaction.
     * @returns {Promise<Object|null>} The transaction object or null.
     */
    static async getById(transactionId) {
        const result = await pool.query(
            'SELECT * FROM transactions WHERE id = $1',
            [transactionId]
        );
        return result.rows[0] || null;
    }
}

module.exports = Transaction;
