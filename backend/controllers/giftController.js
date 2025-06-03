const Gift = require('../models/Gift');

// Gift Items Controllers
exports.getAllGiftItems = async (req, res) => {
  try {
    const gifts = await Gift.getAllGiftItems();
    res.json(gifts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get gift items' });
  }
};

exports.getGiftItemById = async (req, res) => {
  try {
    const gift = await Gift.getGiftItemById(req.params.id);
    if (!gift) {
      return res.status(404).json({ error: 'Gift item not found' });
    }
    res.json(gift);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get gift item' });
  }
};

exports.createGiftItem = async (req, res) => {
  try {
    const { name, description, price, imageUrl, category, required_tier_level } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    if (required_tier_level && !['Basic', 'Premium', 'Elite'].includes(required_tier_level)) {
      return res.status(400).json({ error: 'Invalid required_tier_level. Must be Basic, Premium, or Elite.' });
    }

    const gift = await Gift.createGiftItem({
      name,
      description,
      price: parseFloat(price),
      imageUrl,
      category,
      required_tier_level
    });

    res.status(201).json(gift);
  } catch (err) {
    console.error('Error creating gift item:', err);
    res.status(500).json({ error: 'Failed to create gift item' });
  }
};

exports.updateGiftItem = async (req, res) => {
  try {
    const { name, description, price, imageUrl, category, isAvailable, required_tier_level } = req.body;
    
    if (required_tier_level && !['Basic', 'Premium', 'Elite', null].includes(required_tier_level)) {
        return res.status(400).json({ error: 'Invalid required_tier_level. Must be Basic, Premium, Elite, or null.' });
    }

    const giftData = {
      name,
      description,
      imageUrl,
      category,
      isAvailable
    };
    if (price !== undefined) giftData.price = parseFloat(price);
    if (required_tier_level !== undefined) giftData.required_tier_level = required_tier_level;


    const gift = await Gift.updateGiftItem(req.params.id, giftData);

    if (!gift) {
      return res.status(404).json({ error: 'Gift item not found' });
    }

    res.json(gift);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update gift item' });
  }
};

// User Gifts Controllers
exports.sendGift = async (req, res) => {
  try {
    const { recipientId, giftItemId, message, isAnonymous } = req.body;
    
    if (!recipientId || !giftItemId) {
      return res.status(400).json({ error: 'Recipient and gift item are required' });
    }

    const gift = await Gift.sendGift({
      senderId: req.user.id,
      recipientId,
      giftItemId,
      message,
      isAnonymous: !!isAnonymous
    });

    res.status(201).json(gift);
  } catch (err) {
    console.error('Error sending gift:', err);
    if (err.code === 'INSUFFICIENT_TIER') {
      return res.status(403).json({ error: err.message || 'Your subscription tier does not allow sending this gift.' });
    }
    if (err.message && err.message.toLowerCase().includes('gift item not found')) {
        return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to send gift' });
  }
};

exports.getReceivedGifts = async (req, res) => {
  try {
    const gifts = await Gift.getReceivedGifts(req.user.id);
    res.json(gifts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get received gifts' });
  }
};

exports.getSentGifts = async (req, res) => {
  try {
    const gifts = await Gift.getSentGifts(req.user.id);
    res.json(gifts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get sent gifts' });
  }
};

exports.markGiftAsRead = async (req, res) => {
  try {
    const gift = await Gift.markGiftAsRead(req.params.id, req.user.id);
    if (!gift) {
      return res.status(404).json({ error: 'Gift not found' });
    }
    res.json(gift);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark gift as read' });
  }
};

exports.getUnreadGiftCount = async (req, res) => {
  try {
    const count = await Gift.getUnreadGiftCount(req.user.id);
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get unread gift count' });
  }
}; 