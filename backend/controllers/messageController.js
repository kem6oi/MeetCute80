const Message = require('../models/Message');

exports.getConversation = async (req, res) => {
  try {
    const { recipientId } = req.query;
    const conversation = await Message.getConversation(req.user.id, recipientId);
    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const conversations = await Message.getConversations(req.user.id);
    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { senderId } = req.body;
    await Message.markAsRead(req.user.id, senderId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    const message = await Message.create({
      senderId: req.user.id,
      recipientId,
      content: content.trim()
    });
    
    res.json(message);
  } catch (err) {
    console.error('Error sending message:', err.message); // Log the actual error message
    // Check for PostgreSQL RAISE EXCEPTION for message limits
    // PostgreSQL error code for 'raise_exception' is 'P0001'
    if (err.code === 'P0001' && err.message.includes('Daily message limit reached')) {
      res.status(429).json({ error: 'Daily message limit reached. Upgrade to send more messages.' });
    } else {
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
};