const express = require('express');
const cors = require('cors');
const path = require('path');
const env = require('./config/env');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const profileRoutes = require('./routes/profileRoutes');
const matchRoutes = require('./routes/matchRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const boostRoutes = require('./routes/boostRoutes'); // Added
const anonymousBrowsingRoutes = require('./routes/anonymousBrowsingRoutes'); // Added
const videoChatRoutes = require('./routes/videoChatRoutes'); // Added

const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if(!origin) return callback(null, true);
    // Allow all localhost origins
    if(origin.startsWith('http://localhost:')) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging
app.use((req, res, next) => {
  console.log('Request received:', req.method, req.path);
  console.log('Headers:', req.headers);
  next();
});

// Debug route mounting
const debugRoute = (prefix) => (req, res, next) => {
  console.log(`[${prefix}] Route hit:`, req.method, req.path);
  next();
};

app.use('/api/profile', debugRoute('PROFILE'), (req, res, next) => {
  console.log('Profile middleware hit');
  next();
});

// Routes
app.use('/api/auth', debugRoute('AUTH'), authRoutes);
app.use('/api/user', debugRoute('USER'), userRoutes);
app.use('/api/admin', debugRoute('ADMIN'), adminRoutes);
app.use('/api/subscription', debugRoute('SUBSCRIPTION'), subscriptionRoutes);
app.use('/api/profile', debugRoute('PROFILE'), profileRoutes);
app.use('/api/matches', debugRoute('MATCHES'), matchRoutes);
app.use('/api/dashboard', debugRoute('DASHBOARD'), dashboardRoutes);
app.use('/api/boosts', debugRoute('BOOSTS'), boostRoutes); // Added
app.use('/api/browse/anonymous', debugRoute('ANONYMOUS_BROWSING'), anonymousBrowsingRoutes); // Added
app.use('/api/videochat', debugRoute('VIDEOCHAT'), videoChatRoutes); // Added

// Debug any unmatched routes
app.use((req, res, next) => {
  console.log('No route matched:', req.method, req.path);
  next();
});

// Test route
app.get('/api/test', (req, res) => {
  console.log('Test route hit');
  res.json({ message: 'API is working!' });
});

// Test upload route
app.post('/api/test/upload', (req, res) => {
  console.log('Test upload route hit');
  res.json({ message: 'Upload test route is working!' });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const PORT = env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;