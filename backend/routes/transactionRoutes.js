const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { isAuthenticated } = require('../middleware/auth'); // Assuming auth middleware

// Protect all routes in this file
router.use(isAuthenticated);

// Route to initiate a new transaction
router.post('/initiate', transactionController.initiateTransaction);

// Route to submit a payment reference for a transaction
router.post('/:transactionId/submit-reference', transactionController.submitPaymentReference);

// Route to get the status/details of a specific transaction
router.get('/:transactionId', transactionController.getTransactionStatus);

module.exports = router;
