const UserBalance = require('../models/UserBalance');
const WithdrawalRequest = require('../models/WithdrawalRequest');

exports.getUserBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const balanceAccount = await UserBalance.getOrCreateByUserId(userId);
        res.json({ balance: parseFloat(balanceAccount.balance).toFixed(2) });
    } catch (error) {
        console.error('Error fetching user balance:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to fetch balance.' });
    }
};

exports.requestWithdrawal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, paymentDetails } = req.body;

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount.' });
        }
        if (!paymentDetails || typeof paymentDetails !== 'string' || paymentDetails.trim() === '') {
            return res.status(400).json({ error: 'Payment details are required and must be a non-empty string.' });
        }

        // Optional: Add a minimum withdrawal amount check here if desired
        const MIN_WITHDRAWAL_AMOUNT = 1.00; // Example: Minimum $1.00
        if (parseFloat(amount) < MIN_WITHDRAWAL_AMOUNT) {
           return res.status(400).json({ error: `Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT.toFixed(2)}.` });
        }

        const result = await WithdrawalRequest.createRequest({
            userId,
            amount: parseFloat(amount).toFixed(2),
            paymentDetails
        });
        res.status(201).json({
            message: 'Withdrawal request submitted successfully.',
            requestId: result.request.id,
            newBalance: parseFloat(result.newBalance).toFixed(2)
        });
    } catch (error) {
        console.error('Error submitting withdrawal request:', error.message, error.stack);
        if (error.message.includes('Insufficient balance')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to submit withdrawal request.' });
    }
};

exports.getUserWithdrawalRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const requests = await WithdrawalRequest.getByUserId(userId);
        res.json(requests);
    } catch (error)
    {
        console.error('Error fetching user withdrawal requests:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to fetch withdrawal requests.' });
    }
};
