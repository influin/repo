const RateCard = require('../models/RateCard');
const User = require('../models/User');

// @desc    Create a new rate card
// @route   POST /api/ratecards
// @access  Private (Influencer role)
exports.createRateCard = async (req, res) => {
  try {
    // Add the user ID to the rate card
    req.body.userId = req.user._id;
    
    // Create rate card
    const rateCard = await RateCard.create(req.body);
    
    // Add rate card to user's influencer profile
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { 'influencerProfile.rateCards': rateCard._id } }
    );
    
    res.status(201).json({
      success: true,
      rateCard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all rate cards for a user
// @route   GET /api/ratecards
// @access  Private
exports.getUserRateCards = async (req, res) => {
  try {
    const rateCards = await RateCard.find({ userId: req.user._id });
    
    res.status(200).json({
      success: true,
      count: rateCards.length,
      rateCards
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single rate card
// @route   GET /api/ratecards/:id
// @access  Private (owner or public if specified)
exports.getRateCard = async (req, res) => {
  try {
    const rateCard = await RateCard.findById(req.params.id);
    
    if (!rateCard) {
      return res.status(404).json({ success: false, message: 'Rate card not found' });
    }
    
    // Check if user is the owner of the rate card or if it's a public request
    const isOwner = req.user && rateCard.userId.toString() === req.user._id.toString();
    
    if (!isOwner) {
      // For non-owners, we might want to limit what information is returned
      // or check if the rate card is meant to be public
      // This is just a placeholder for that logic
    }
    
    res.status(200).json({
      success: true,
      rateCard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update rate card
// @route   PUT /api/ratecards/:id
// @access  Private (owner only)
exports.updateRateCard = async (req, res) => {
  try {
    let rateCard = await RateCard.findById(req.params.id);
    
    if (!rateCard) {
      return res.status(404).json({ success: false, message: 'Rate card not found' });
    }
    
    // Check if user is the owner of the rate card
    if (rateCard.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this rate card' });
    }
    
    // Update rate card
    rateCard = await RateCard.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      rateCard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete rate card
// @route   DELETE /api/ratecards/:id
// @access  Private (owner only)
exports.deleteRateCard = async (req, res) => {
  try {
    const rateCard = await RateCard.findById(req.params.id);
    
    if (!rateCard) {
      return res.status(404).json({ success: false, message: 'Rate card not found' });
    }
    
    // Check if user is the owner of the rate card
    if (rateCard.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this rate card' });
    }
    
    // Remove rate card from user's influencer profile
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { 'influencerProfile.rateCards': rateCard._id } }
    );
    
    await rateCard.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Rate card deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};