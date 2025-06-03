const pool = require('../config/db');

// Get dashboard stats for the current user
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get match count
    const matchCountQuery = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS week,
        COUNT(*) AS total
      FROM matches 
      WHERE user1_id = $1 OR user2_id = $1`,
      [userId]
    );
    
    // Get message count
    const messageCountQuery = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours' AND read = false) AS today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days' AND read = false) AS week,
        COUNT(*) FILTER (WHERE read = false) AS unread,
        COUNT(*) AS total
      FROM messages 
      WHERE recipient_id = $1`,
      [userId]
    );
    
    // Get profile view count
    const profileViewQuery = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE viewed_at >= NOW() - INTERVAL '24 hours') AS today,
        COUNT(*) FILTER (WHERE viewed_at >= NOW() - INTERVAL '7 days') AS week,
        COUNT(*) AS total
      FROM profile_views 
      WHERE viewed_user_id = $1`,
      [userId]
    );
    
    // Format the response
    const stats = {
      matches: {
        today: parseInt(matchCountQuery.rows[0].today || 0),
        week: parseInt(matchCountQuery.rows[0].week || 0),
        total: parseInt(matchCountQuery.rows[0].total || 0)
      },
      messages: {
        today: parseInt(messageCountQuery.rows[0].today || 0),
        week: parseInt(messageCountQuery.rows[0].week || 0),
        unread: parseInt(messageCountQuery.rows[0].unread || 0),
        total: parseInt(messageCountQuery.rows[0].total || 0)
      },
      profileViews: {
        today: parseInt(profileViewQuery.rows[0].today || 0),
        week: parseInt(profileViewQuery.rows[0].week || 0),
        total: parseInt(profileViewQuery.rows[0].total || 0)
      }
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

// Get recent activity for the current user
exports.getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const activities = [];
    
    // Get recent matches (past 7 days)
    const matchesQuery = await pool.query(
      `SELECT m.id, m.created_at, 
        CASE 
          WHEN m.user1_id = $1 THEN p2.first_name
          ELSE p1.first_name
        END AS other_user_name,
        CASE 
          WHEN m.user1_id = $1 THEN p2.profile_picture
          ELSE p1.profile_picture
        END AS profile_picture,
        CASE 
          WHEN m.user1_id = $1 THEN m.user2_id
          ELSE m.user1_id
        END AS other_user_id
      FROM matches m
      JOIN profiles p1 ON m.user1_id = p1.user_id
      JOIN profiles p2 ON m.user2_id = p2.user_id
      WHERE (m.user1_id = $1 OR m.user2_id = $1)
        AND m.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY m.created_at DESC
      LIMIT 5`,
      [userId]
    );
    
    // Format matches as activities
    for (const match of matchesQuery.rows) {
      activities.push({
        type: 'match',
        title: 'New Match!',
        description: `You and ${match.other_user_name} have liked each other`,
        time: match.created_at,
        userId: match.other_user_id,
        profilePicture: match.profile_picture
      });
    }
    
    // Get recent messages (past 7 days)
    const messagesQuery = await pool.query(
      `SELECT m.id, m.created_at, m.content, p.first_name, p.profile_picture, m.sender_id
      FROM messages m
      JOIN profiles p ON m.sender_id = p.user_id
      WHERE m.recipient_id = $1
        AND m.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY m.created_at DESC
      LIMIT 5`,
      [userId]
    );
    
    // Format messages as activities
    for (const message of messagesQuery.rows) {
      activities.push({
        type: 'message',
        title: 'Message Received',
        description: `${message.first_name} sent you a message: "${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}"`,
        time: message.created_at,
        userId: message.sender_id,
        profilePicture: message.profile_picture
      });
    }
    
    // Get recent profile views (past 7 days)
    const viewsQuery = await pool.query(
      `SELECT pv.id, pv.viewed_at, p.first_name, p.profile_picture, pv.viewer_id
      FROM profile_views pv
      JOIN profiles p ON pv.viewer_id = p.user_id
      WHERE pv.viewed_user_id = $1
        AND pv.viewed_at >= NOW() - INTERVAL '7 days'
      ORDER BY pv.viewed_at DESC
      LIMIT 5`,
      [userId]
    );
    
    // Format profile views as activities
    for (const view of viewsQuery.rows) {
      activities.push({
        type: 'view',
        title: 'Profile Viewed',
        description: `${view.first_name} viewed your profile`,
        time: view.viewed_at,
        userId: view.viewer_id,
        profilePicture: view.profile_picture
      });
    }
    
    // Sort all activities by time (most recent first)
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    // Format times as relative (e.g., "5 minutes ago")
    const formatRelativeTime = (date) => {
      const now = new Date();
      const diffMs = now - new Date(date);
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };
    
    // Apply relative time formatting
    activities.forEach(activity => {
      activity.relativeTime = formatRelativeTime(activity.time);
    });
    
    res.json(activities.slice(0, 10)); // Return at most 10 activities
  } catch (err) {
    console.error('Error fetching recent activity:', err);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};
