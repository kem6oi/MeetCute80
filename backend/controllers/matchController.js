const pool = require('../config/db');
const Match = require('../models/Match');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Like = require('../models/Like');

exports.getPotentialMatches = async (req, res) => {
  try {
    const matches = await Profile.getPotentialMatches(req.user.id);
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get matches' });
  }
};

exports.likeProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const likedUserId = req.params.id;
    
    // Check if user is liking themselves
    if (userId === likedUserId) {
      return res.status(400).json({ error: 'Cannot like yourself' });
    }
    
    // Check if user exists
    const userExists = await User.findById(likedUserId);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if the like already exists
    const existingLike = await pool.query(
      'SELECT * FROM likes WHERE user_id = $1 AND liked_user_id = $2',
      [userId, likedUserId]
    );
    
    if (existingLike.rows.length > 0) {
      // Already liked this profile
      // Check for mutual like
      const isMutual = await Match.checkMutualLike(userId, likedUserId);
      return res.json({ 
        match: isMutual,
        alreadyLiked: true,
        message: 'You have already liked this profile' 
      });
    }
    
    // Record the like
    await Match.createLike({ userId, likedUserId });
    
    // Check for mutual like
    const isMutual = await Match.checkMutualLike(userId, likedUserId);
    
    if (isMutual) {
      // Create a match
      await Match.createMatch(userId, likedUserId);
      return res.json({ match: true });
    }
    
    res.json({ match: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to like profile' });
  }
};

exports.getMatches = async (req, res) => {
  try {
    const matches = await Match.getUserMatches(req.user.id);
    
    // Transform the data to include only the other user's info for each match
    const transformedMatches = matches.map(match => {
      const isUser1 = match.user1_id === req.user.id;
      return {
        id: match.id,
        matchedUser: {
          id: isUser1 ? match.user2_id : match.user1_id,
          firstName: isUser1 ? match.user2_first_name : match.user1_first_name,
          lastName: isUser1 ? match.user2_last_name : match.user1_last_name,
          profilePic: isUser1 ? match.user2_profile_pic : match.user1_profile_pic
        },
        createdAt: match.created_at
      };
    });

    res.json(transformedMatches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get matches' });
  }
};

exports.checkAndCreateMatch = async (req, res) => {
  try {
    const { likedUserId } = req.body;
    
    if (!likedUserId) {
      return res.status(400).json({ error: 'likedUserId is required' });
    }

    // Create the like
    await Like.createLike(req.user.id, likedUserId);
    
    // Check if the other user has already liked the current user
    const otherUserLike = await Like.checkLike(likedUserId, req.user.id);
    
    if (otherUserLike) {
      // If mutual like, create a match
      const existingMatch = await Match.checkMatch(req.user.id, likedUserId);
      
      if (!existingMatch) {
        const match = await Match.createMatch(req.user.id, likedUserId);
        res.json({ match, message: "It's a match!" });
      } else {
        res.json({ match: existingMatch, message: 'Match already exists' });
      }
    } else {
      res.json({ message: 'Like recorded, waiting for the other person to like back' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process match' });
  }
};

exports.unmatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const deletedMatch = await Match.deleteMatch(matchId, req.user.id);
    
    if (!deletedMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Also delete the mutual likes
    const match = deletedMatch;
    await Like.deleteLike(match.user1_id, match.user2_id);
    await Like.deleteLike(match.user2_id, match.user1_id);
    
    res.json({ message: 'Successfully unmatched' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unmatch' });
  }
};