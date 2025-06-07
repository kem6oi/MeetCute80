const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Profile = require('../models/Profile');
const env = require('../config/env');
const { validateRegister, validateLogin } = require('../utils/validation');

exports.register = async (req, res) => {
  try {
    const { error } = validateRegister(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password, role, phone, countryId } = req.body;
    
    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification token
    const email_verification_token = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await User.create({ 
      email, 
      password: hashedPassword, 
      role: role || 'user',
      phone: phone || null,
      country_id: countryId || null,
      email_verification_token
    });

    // TODO: Send verification email to user.email with token

    res.status(201).json({ message: "Registration successful. Please check your email to verify your account." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { error } = validateLogin(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password } = req.body;
    
    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.is_email_verified) {
      return res.status(403).json({
        error: "Email not verified. Please check your inbox for a verification link.",
        status: "email_unverified"
      });
    }

    // Check if user is suspended
    if (user.is_suspended) {
      return res.status(403).json({ 
        error: 'Account suspended',
        reason: user.suspension_reason || 'Violation of community guidelines',
        suspended_at: user.suspended_at,
        status: 'suspended'
      });
    }

    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      profile_complete: user.profile_complete || false 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = await User.findByVerificationToken(token);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    await User.verifyEmail(user.id);

    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Email verification failed' });
  }
};