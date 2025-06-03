const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Corrected: require('fs')
const { isAuthenticated } = require('../middleware/auth');
// checkPremiumFeature is removed, checkFeatureAccess is new
const { checkSubscription, checkFeatureAccess } = require('../middleware/subscription');
const { profileViewAnalyticsRateLimiter } = require('../middleware/rateLimiter'); // Added
const userController = require('../controllers/userController');
const Profile = require('../models/Profile');
const ProfileView = require('../models/ProfileView');
const AnonymousBrowsingSession = require('../models/AnonymousBrowsingSession'); // Added
const pool = require('../config/db');

// Set up multer storage for profile pictures
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = './uploads/profile_pictures';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    cb(null, `user_${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get current user's profile (both /profile and /profile/me will work)
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const profile = await Profile.findByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/profile/me', isAuthenticated, async (req, res) => {
  try {
    const profile = await Profile.findByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get profile by ID (requires subscription for non-matched profiles)
router.get('/profile/:id', isAuthenticated, checkSubscription, async (req, res) => {
  try {
    // Skip if the ID is 'me' as it's handled by the route above
    if (req.params.id === 'me') {
      return next();
    }
    
    const profileUserId = parseInt(req.params.id);
    const viewerId = req.user.id;
    
    const profile = await Profile.findByUserId(profileUserId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Record the profile view (only if viewing someone else's profile and viewer is not anonymous)
    if (profileUserId !== viewerId) {
      let recordView = true; // Default to recording the view
      // Check if the viewer has an active anonymous browsing session
      const isActiveAnonymous = await AnonymousBrowsingSession.isActive(viewerId);
      if (isActiveAnonymous) {
        recordView = false; // Do not record if anonymous
      }

      // Conditionally record the profile view
      if (recordView) {
        await ProfileView.recordView(profileUserId, viewerId);
      }
    }
    
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update profile
router.post('/profile', isAuthenticated, async (req, res) => {
  try {
    const { firstName, lastName, dob, gender, bio } = req.body;
    const profile = await Profile.createOrUpdate({
      userId: req.user.id,
      firstName,
      lastName,
      dob,
      gender,
      bio
    });
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
router.put('/profile', isAuthenticated, async (req, res) => {
  try {
    const { firstName, lastName, dob, gender, bio } = req.body;
    const profile = await Profile.createOrUpdate({
      userId: req.user.id,
      firstName,
      lastName,
      dob,
      gender,
      bio
    });
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- User Feature Routes ---

// Who Likes You feature - GET /api/user/likes/received
router.get(
  '/likes/received',
  isAuthenticated,
  checkSubscription, // Ensures req.subscription is populated for checkFeatureAccess
  checkFeatureAccess('whoLikesYou'), // 'whoLikesYou' is the assumed feature_key
  userController.getWhoLikedMe
);

// Profile Views feature - GET /api/user/profile-views
router.get(
  '/profile-views',
  isAuthenticated,
  checkSubscription, // Ensures req.subscription is populated
  checkFeatureAccess('profileViews'), // 'profileViews' is the assumed feature_key
  profileViewAnalyticsRateLimiter, // Apply rate limiting
  async (req, res) => {
    // TODO: Implement actual logic for fetching profile views
    // This might involve a new controller method in userController.js
    // For now, returning placeholder if the old one was just a placeholder.
    // Example: const views = await ProfileView.getViewsForUser(req.user.id);
    // res.json(views);
    res.status(501).json({ message: 'Profile views feature not fully implemented yet.' });
  }
);

// Advanced Matches feature - GET /api/user/advanced-matches
router.get(
  '/advanced-matches',
  isAuthenticated,
  checkSubscription, // Ensures req.subscription is populated
  checkFeatureAccess('advancedMatching'), // 'advancedMatching' is the assumed feature_key
  async (req, res) => {
    // TODO: Implement actual logic for fetching advanced matches
    // This might involve a new controller method
    // For now, returning placeholder.
    res.status(501).json({ message: 'Advanced matching feature not fully implemented yet.' });
  }
);

// Note: POST /profile-boost route was removed as it's now handled by boostRoutes.js

// Route for uploading profile picture
router.post('/profile/picture', isAuthenticated, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path.replace(/\\/g, '/'); // Normalize path for all platforms
    const profilePicture = `/uploads/profile_pictures/${path.basename(filePath)}`;
    
    // Update the profile picture path in the database
    await pool.query(
      'UPDATE profiles SET profile_picture = $1 WHERE user_id = $2',
      [profilePicture, req.user.id]
    );
    
    res.json({ success: true, profilePicture });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Route for marking profile as complete
router.put('/profile/complete', isAuthenticated, async (req, res) => {
  try {
    // Update the profile_complete flag in the users table
    await pool.query(
      'UPDATE users SET profile_complete = true WHERE id = $1',
      [req.user.id]
    );
    
    res.json({ success: true, message: 'Profile marked as complete' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile status' });
  }
});

module.exports = router;