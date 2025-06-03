const User = require('../models/User');
const Profile = require('../models/Profile');
const Like = require('../models/Like'); // Added Like model
const { validateProfile } = require('../utils/validation');

exports.getCurrentUserProfile = async (req, res) => {
  try {
    const profile = await Profile.findByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const profile = await Profile.findByUserId(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { error } = validateProfile(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { firstName, lastName, dob, gender, bio } = req.body;
    
    const profile = await Profile.createOrUpdate({
      userId: req.user.id,
      firstName,
      lastName,
      dob,
      gender,
      bio
    });
    
    // Mark profile as complete
    await User.updateProfileComplete(req.user.id);
    
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * Gets a list of users who have liked the currently authenticated user.
 * This route will be protected by isAuthenticated and checkFeatureAccess('whoLikesYou').
 */
exports.getWhoLikedMe = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming isAuthenticated populates req.user
    const likers = await Like.getUsersWhoLiked(userId);
    res.json(likers);
  } catch (err) {
    console.error('Error in getWhoLikedMe controller:', err);
    res.status(500).json({ error: 'Failed to retrieve users who liked you.' });
  }
};