const jwt = require('jsonwebtoken');
const env = require('../config/env');
const pool = require('../config/db');

const isAuthenticated = async (req, res, next) => {
  try {
    // Get token from header - check both formats
    let token = req.header('x-auth-token');
    
    // If x-auth-token is not present, check Authorization header
    if (!token) {
      const authHeader = req.header('Authorization');
      if (!authHeader) {
        return res.status(401).json({ message: 'No token, authorization denied' });
      }
      // Extract token from Bearer format
      token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    // Get user from database
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, email, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'User not found' });
      }

      const user = result.rows[0];
      
      if (!user.is_active) {
        return res.status(401).json({ message: 'Account is suspended' });
      }

      // Add user to request object
      req.user = user;
      next();
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const isAdmin = async (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

const isUser = (req, res, next) => {
  if (req.user && req.user.role === 'user') {
    next();
  } else {
    // If req.user is not defined, isAuthenticated might not have run or failed.
    // Or, the role is not 'user'.
    res.status(403).json({ error: 'Access denied. This action is for users only.' });
  }
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isUser
};