const pool = require('../config/db');
const UserBalance = require('./UserBalance'); // For debiting balance

class WithdrawalRequest {
    static async createRequest({ userId, amount, paymentDetails }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Check and debit user's balance
            // UserBalance.debit will throw an error if insufficient, rolling back the transaction.
            const newBalanceState = await UserBalance.debit(userId, parseFloat(amount), client);

            // 2. Create withdrawal request
            const result = await client.query(
                `INSERT INTO withdrawal_requests (user_id, amount, user_payment_details, status)
                 VALUES ($1, $2, $3, 'pending') RETURNING *`,
                [userId, parseFloat(amount), paymentDetails]
            );

            await client.query('COMMIT');
            return { request: result.rows[0], newBalance: newBalanceState.balance };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating withdrawal request:', error.message, error.stack);
            throw error; // Re-throw to be handled by controller
        } finally {
            client.release();
        }
    }

    static async getById(requestId, client = pool) {
        const result = await client.query('SELECT * FROM withdrawal_requests WHERE id = $1', [requestId]);
        return result.rows[0];
    }

    static async getByUserId(userId, client = pool) {
        const result = await client.query(
            'SELECT * FROM withdrawal_requests WHERE user_id = $1 ORDER BY requested_at DESC',
            [userId]
        );
        return result.rows;
    }

    static async getAll(client = pool) { // For admin
        const result = await client.query(`
            SELECT wr.*, u.email as user_email
            FROM withdrawal_requests wr
            JOIN users u ON wr.user_id = u.id
            ORDER BY wr.requested_at DESC
        `);
        return result.rows;
    }

    static async getByStatus(status, client = pool) { // For admin
         const result = await client.query(`
            SELECT wr.*, u.email as user_email
            FROM withdrawal_requests wr
            JOIN users u ON wr.user_id = u.id
            WHERE wr.status = $1
            ORDER BY wr.requested_at DESC
        `, [status]);
        return result.rows;
    }

    static async updateStatus({ requestId, newStatus, adminId, adminNotes = null }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const request = await this.getById(requestId, client); // Use FOR UPDATE if concurrent updates are a concern on this specific request
            if (!request) {
                throw new Error('Withdrawal request not found.');
            }

            // If declining a request where balance was already debited, credit it back.
            // This logic assumes 'pending' status means balance was debited at creation.
            if (newStatus === 'declined' && request.status === 'pending') {
                await UserBalance.credit(request.user_id, parseFloat(request.amount), client);
            } else if (newStatus === 'declined' && request.status === 'approved' ) {
                // If it was 'approved' and is now 'declined', it implies it wasn't 'processed'.
                // If 'processed' implies money sent, then declining after 'processed' is complex and needs careful thought.
                // For now, assume 'approved' can be rolled back by refunding.
                await UserBalance.credit(request.user_id, parseFloat(request.amount), client);
            }
            // Note: If newStatus is 'processed', the money is assumed to be sent externally.
            // No balance change here; that happened at request creation or if it was 'approved' and now 'processed'.
            // If 'approved' status itself triggered an external hold or some other action, that logic would be here too.

            const result = await client.query(
                `UPDATE withdrawal_requests
                 SET status = $1, admin_notes = $2, processed_at = CURRENT_TIMESTAMP, processed_by = $3
                 WHERE id = $4 RETURNING *`,
                [newStatus, adminNotes, adminId, requestId]
            );

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`Error updating withdrawal request ${requestId} to ${newStatus}:`, error.message, error.stack);
            throw error;
        } finally {
            client.release();
        }
    }
}
module.exports = WithdrawalRequest;
