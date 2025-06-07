const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const pool = require('./config/db');
const setupWebSocket = require('./websocket/wsServer');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth'); // Using auth.js instead of authRoutes.js
const userRoutes = require('./routes/userRoutes');
const matchRoutes = require('./routes/matchRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const giftRoutes = require('./routes/giftRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const profileRoutes = require('./routes/profileRoutes'); // Added profile routes
const countryRoutes = require('./routes/countryRoutes'); // Added country routes
const dashboardRoutes = require('./routes/dashboardRoutes'); // Added dashboard routes
const boostRoutes = require('./routes/boostRoutes');
const anonymousBrowsingRoutes = require('./routes/anonymousBrowsingRoutes');
const videoChatRoutes = require('./routes/videoChatRoutes');
const paymentMethodAdminRoutes = require('./routes/paymentMethodAdminRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminTransactionRoutes = require('./routes/adminTransactionRoutes');
const balanceRoutes = require('./routes/balanceRoutes'); // Import balanceRoutes

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Allow both localhost and 127.0.0.1
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  exposedHeaders: ['x-auth-token'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// General Request logging middleware - MOVED HERE
app.use((req, res, next) => {
  console.log('Request received:', req.method, req.path);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/profile', profileRoutes); // Added profile routes
app.use('/api/countries', countryRoutes); // Added country routes
app.use('/api/dashboard', dashboardRoutes); // Added dashboard routes
app.use('/api/boosts', boostRoutes);
app.use('/api/browse/anonymous', anonymousBrowsingRoutes);
app.use('/api/videochat', videoChatRoutes);
app.use('/api/admin/payment-configurations', paymentMethodAdminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin/transactions', adminTransactionRoutes);
app.use('/api/balance', balanceRoutes); // Mount balanceRoutes

// Add direct routes for backward compatibility with frontend
app.get('/subscription/packages', (req, res) => {
  // Forward the request to the subscriptionController.getPackages function
  require('./controllers/subscriptionController').getPackages(req, res);
});

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// The moved general request logger above replaces this one.
// This specific debug logging middleware instance is now removed.

// Debug route for matches
app.get('/api/debug/matches', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, 
        p1.first_name as user1_first_name, p1.last_name as user1_last_name, p1.profile_pic as user1_profile_pic,
        p2.first_name as user2_first_name, p2.last_name as user2_last_name, p2.profile_pic as user2_profile_pic
      FROM matches m
      JOIN profiles p1 ON m.user1_id = p1.user_id
      JOIN profiles p2 ON m.user2_id = p2.user_id
      ORDER BY m.created_at DESC`
    );
    console.log('Debug matches data:', JSON.stringify(result.rows, null, 2));
    res.json(result.rows);
  } catch (err) {
    console.error('Error in debug matches route:', err);
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware
app.use(errorHandler); // Changed to use imported errorHandler

// Start server
const server = app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});

// WebSocket setup
setupWebSocket(server);