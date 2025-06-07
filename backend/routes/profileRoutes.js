const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isAuthenticated, isUser } = require('../middleware/auth'); // Added isUser
const Profile = require('../models/Profile');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/profile-pictures');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Debug logging middleware
router.use((req, res, next) => {
  console.log('Profile route accessed:', req.method, req.path);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Upload profile picture
router.post('/picture', isAuthenticated, isUser, upload.single('profilePicture'), async (req, res) => { // Added isUser
  console.log('Upload endpoint hit, file:', req.file);
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Construct the URL path (without duplicate 'uploads')
    const filePath = `/uploads/profile-pictures/${path.basename(req.file.path)}`;
    console.log('Image URL path:', filePath);
    
    // Update profile with new picture URL
    await Profile.updateProfilePicture(req.user.id, filePath);

    res.json({ 
      message: 'Profile picture uploaded successfully',
      profilePicture: filePath
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Serve profile pictures
router.get('/picture/:filename', (req, res) => {
  const filename = req.params.filename;
  res.sendFile(path.join(__dirname, '../uploads/profile-pictures', filename));
});

module.exports = router;
