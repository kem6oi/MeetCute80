const Transaction = require('../models/Transaction');
const PaymentMethod = require('../models/PaymentMethod'); // For potential direct use
const Subscription = require('../models/Subscription'); // For fetching item details like price

/**
 * Initiates a new transaction for a payable item (e.g., subscription package).
 */
exports.initiateTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const { countryId, paymentMethodTypeId, itemCategory, itemId } = req.body;

        // Validate required inputs
        if (!countryId || !paymentMethodTypeId || !itemCategory || !itemId) {
            return res.status(400).json({ message: 'Missing required fields: countryId, paymentMethodTypeId, itemCategory, itemId.' });
        }

        const cId = parseInt(countryId);
        const pmTypeId = parseInt(paymentMethodTypeId);
        const iId = parseInt(itemId);

        if (isNaN(cId) || isNaN(pmTypeId) || isNaN(iId)) {
            return res.status(400).json({ message: 'Country ID, Payment Method Type ID, and Item ID must be valid numbers.' });
        }

        let amount;
        let currency;

        if (itemCategory === 'subscription') {
            const subscriptionPackage = await Subscription.getPackageById(iId);
            if (!subscriptionPackage) { // Assuming getPackageById returns null if not found
                return res.status(404).json({ message: 'Subscription package not found.' });
            }
            // TODO: Confirm if package object has an is_active flag to check
            // if (subscriptionPackage.is_active === false) {
            //     return res.status(400).json({ message: 'Selected subscription package is not active.' });
            // }
            amount = subscriptionPackage.price;
            currency = subscriptionPackage.currency || 'USD'; // Assuming USD if currency not on package
                                                             // In a real app, currency should be explicit.
        } else if (itemCategory === 'gift') {
            // Placeholder for gift item logic - fetch gift details and price
            // const gift = await Gift.getById(iId); // Example
            // if (!gift) return res.status(404).json({ message: 'Gift item not found.' });
            // amount = gift.price;
            // currency = gift.currency || 'USD';
            return res.status(400).json({ message: 'Gift transactions are not yet supported.' });
        } else {
            return res.status(400).json({ message: 'Invalid itemCategory.' });
        }

        if (typeof amount !== 'number' || amount <= 0) {
             return res.status(400).json({ message: 'Invalid amount for the item.' });
        }

        const transactionDetails = await Transaction.initiate({
            userId,
            countryId: cId,
            paymentMethodTypeId: pmTypeId,
            amount,
            currency,
            itemCategory,
            payableItemId: iId
        });

        res.status(201).json(transactionDetails);

    } catch (error) {
        console.error('Error initiating transaction:', error);
        if (error.message.includes('Selected payment method is not available')) {
            return res.status(400).json({ message: error.message });
        }
        // Handle other specific errors like foreign key violations from DB if paymentMethodTypeId is invalid
        if (error.code === '23503') { // PostgreSQL foreign key violation
             return res.status(400).json({ message: 'Invalid payment method type or country ID.' });
        }
        res.status(500).json({ message: 'Failed to initiate transaction', error: error.message });
    }
};

/**
 * Submits a user-provided payment reference for a transaction.
 */
exports.submitPaymentReference = async (req, res) => {
    try {
        const userId = req.user.id;
        const { transactionId } = req.params;
        const { userProvidedReference } = req.body;

        const tId = parseInt(transactionId);

        if (isNaN(tId)) {
            return res.status(400).json({ message: 'Invalid transaction ID.' });
        }
        if (!userProvidedReference || typeof userProvidedReference !== 'string' || userProvidedReference.trim() === '') {
            return res.status(400).json({ message: 'User provided reference is required and must be a non-empty string.' });
        }

        const updatedTransaction = await Transaction.submitReference({
            transactionId: tId,
            userId,
            userProvidedReference
        });

        res.status(200).json(updatedTransaction);

    } catch (error) {
        console.error('Error submitting payment reference:', error);
        if (error.message.includes('Transaction not found') || error.message.includes('not awaiting payment reference')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Failed to submit payment reference', error: error.message });
    }
};

/**
 * Gets the status and details of a specific transaction.
 */
exports.getTransactionStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { transactionId } = req.params;
        const tId = parseInt(transactionId);

        if (isNaN(tId)) {
            return res.status(400).json({ message: 'Invalid transaction ID.' });
        }

        const transaction = await Transaction.getByIdForUser(tId, userId);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        res.status(200).json(transaction);

    } catch (error) {
        console.error('Error getting transaction status:', error);
        res.status(500).json({ message: 'Failed to get transaction status', error: error.message });
    }
};
