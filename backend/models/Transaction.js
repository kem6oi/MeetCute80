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

    /**
     * Fetches transactions with status = 'pending_verification'.
     * Joins with users, payment_methods, and countries for detailed info.
     * @param {number} [limit=20] - Number of records to fetch.
     * @param {number} [offset=0] - Number of records to skip for pagination.
     * @returns {Promise<{transactions: Array<Object>, totalCount: number}>} List of transactions and total count.
     */
    static async getPendingVerification(limit = 20, offset = 0) {
        const query = `
            SELECT
                t.id, t.user_id, t.amount, t.currency, t.status,
                t.item_category, t.payable_item_id, t.user_provided_reference,
                t.created_at, t.updated_at,
                u.email AS user_email,
                pm.name AS payment_method_name,
                pm.code AS payment_method_code,
                co.name AS payment_country_name
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            JOIN payment_methods pm ON t.payment_method_type_id = pm.id
            JOIN countries co ON t.payment_country_id = co.id
            WHERE t.status = 'pending_verification'
            ORDER BY t.created_at ASC
            LIMIT $1 OFFSET $2;
        `;

        const countQuery = `
            SELECT COUNT(*) FROM transactions WHERE status = 'pending_verification';
        `;

        const [transactionsResult, countResult] = await Promise.all([
            pool.query(query, [limit, offset]),
            pool.query(countQuery)
        ]);

        return {
            transactions: transactionsResult.rows,
            totalCount: parseInt(countResult.rows[0].count, 10)
        };
    }

    /**
     * Verifies a transaction and triggers fulfillment if applicable.
     * @param {Object} details - Verification details.
     * @param {number} details.transactionId - The ID of the transaction to verify.
     * @param {number} details.adminId - The ID of the admin performing the verification (for audit).
     * @param {string} details.newStatus - The new status, must be 'completed' or 'declined'.
     * @param {string} [details.adminNotes] - Optional notes from the admin.
     * @returns {Promise<Object>} The updated transaction record.
     * @throws {Error} If transaction not found, invalid newStatus, or fulfillment fails.
     */
    static async verify({ transactionId, adminId, newStatus, adminNotes }) {
        if (newStatus !== 'completed' && newStatus !== 'declined') {
            throw new Error("Invalid new status. Must be 'completed' or 'declined'.");
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Fetch the transaction to verify its current state and details
            const currentTransactionResult = await client.query(
                'SELECT * FROM transactions WHERE id = $1 FOR UPDATE', // Lock the row
                [transactionId]
            );
            const currentTransaction = currentTransactionResult.rows[0];

            if (!currentTransaction) {
                throw new Error('Transaction not found.');
            }
            if (currentTransaction.status !== 'pending_verification') {
                // Or, allow verification even if it's e.g. pending_payment, depending on admin workflow
                throw new Error(`Transaction is not in 'pending_verification' status (current: ${currentTransaction.status}). Cannot verify.`);
            }

            // 2. Update the main transaction record
            const updateTransactionQuery = `
                UPDATE transactions
                SET status = $1, admin_notes = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *;
            `;
            const updatedTransactionResult = await client.query(updateTransactionQuery, [
                newStatus,
                adminNotes,
                transactionId
            ]);
            const updatedTransactionDetails = updatedTransactionResult.rows[0];

            // 3. Fulfillment logic (if status is 'completed')
            if (newStatus === 'completed') {
                if (updatedTransactionDetails.item_category === 'subscription') {
                    // Find and activate the corresponding user_subscription
                    // This assumes Subscription.createUserSubscription created a 'pending_verification' user_subscription
                    const userSubUpdateResult = await client.query(
                        `UPDATE user_subscriptions
                         SET status = 'active',
                             start_date = CURRENT_TIMESTAMP,
                             -- Store our transaction.id as a reference. Ensure column type is compatible (VARCHAR).
                             payment_method_id = $3
                         WHERE user_id = $1 AND package_id = $2 AND status = 'pending_verification'
                         ORDER BY created_at DESC -- In case multiple exist, activate the most recent pending one
                         LIMIT 1
                         RETURNING id, status;`,
                        [updatedTransactionDetails.user_id, updatedTransactionDetails.payable_item_id, updatedTransactionDetails.id.toString()]
                    );

                    if (userSubUpdateResult.rows.length > 0) {
                        const activatedSubscriptionId = userSubUpdateResult.rows[0].id;

                        // Fetch the payment method name using payment_method_type_id from the main transaction
                        const pmType = await PaymentMethod.getTypeById(updatedTransactionDetails.payment_method_type_id);
                        const paymentMethodName = pmType ? pmType.name : 'Unknown';


                        // Update the corresponding subscription_transactions record
                        await client.query(
                            `UPDATE subscription_transactions
                             SET status = 'completed',
                                 payment_method = $2, -- Store the actual payment method name/code used
                                 updated_at = CURRENT_TIMESTAMP
                             WHERE subscription_id = $1 AND status = 'pending_verification'
                             ORDER BY created_at DESC
                             LIMIT 1;`,
                            [activatedSubscriptionId, paymentMethodName]
                        );
                         console.log(`Subscription ${activatedSubscriptionId} activated and transaction ${transactionId} completed.`);
                    } else {
                        // This is a critical issue: transaction completed but couldn't activate the service.
                        console.warn(`CRITICAL: Transaction ${transactionId} completed for user ${updatedTransactionDetails.user_id}, package ${updatedTransactionDetails.payable_item_id}, but no 'pending_verification' user_subscription was found to activate.`);
                        // Depending on business rules, you might:
                        // 1. Throw an error here to ROLLBACK the entire operation.
                        // 2. Let it commit and flag for manual review.
                        // For now, it logs a warning and the transaction status update will commit.
                        // throw new Error('Fulfillment failed: Could not find pending subscription to activate.');
                    }
                } else if (updatedTransactionDetails.item_category === 'gift') {
                    // TODO: Implement gift fulfillment logic
                    console.log(`TODO: Fulfill gift for transaction ${transactionId}`);
                } else if (updatedTransactionDetails.item_category === 'boost') {
                    // TODO: Implement boost fulfillment logic
                    console.log(`TODO: Fulfill boost for transaction ${transactionId}`);
                }
            }
            // TODO: Log admin action (adminId, transactionId, oldStatus, newStatus, notes)

            await client.query('COMMIT');
            return updatedTransactionDetails;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`Error verifying transaction ${transactionId}:`, error);
            throw error; // Re-throw to be caught by controller
        } finally {
            client.release();
        }
    }

    /**
     * Fetches all transactions for a given userId with pagination.
     * Joins with payment_methods and countries.
     * @param {Object} params - Parameters for listing transactions.
     * @param {number} params.userId - The ID of the user.
     * @param {number} [params.limit=10] - Number of records to fetch.
     * @param {number} [params.offset=0] - Number of records to skip.
     * @returns {Promise<{transactions: Array<Object>, totalCount: number}>} List of transactions and total count.
     */
    static async listByUserId({ userId, limit = 10, offset = 0 }) {
        const query = `
            SELECT
                t.id,
                t.user_id,
                t.amount,
                t.currency,
                t.status,
                t.item_category,
                t.payable_item_id,
                t.user_provided_reference,
                t.admin_notes,
                t.created_at,
                t.updated_at,
                pm.name AS payment_method_name,
                pm.code AS payment_method_code,
                co.name AS payment_country_name
            FROM transactions t
            LEFT JOIN payment_methods pm ON t.payment_method_type_id = pm.id
            LEFT JOIN countries co ON t.payment_country_id = co.id
            WHERE t.user_id = $1
            ORDER BY t.created_at DESC
            LIMIT $2 OFFSET $3;
        `;

        const countQuery = `
            SELECT COUNT(*) FROM transactions WHERE user_id = $1;
        `;

        const [transactionsResult, countResult] = await Promise.all([
            pool.query(query, [userId, limit, offset]),
            pool.query(countQuery, [userId])
        ]);

        return {
            transactions: transactionsResult.rows,
            totalCount: parseInt(countResult.rows[0].count, 10)
        };
    }
}

module.exports = Transaction;
