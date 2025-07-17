const User = require('../models/User');
const RateCard = require('../models/RateCard');

// @desc    Get influencer profile
// @route   GET /api/influencer/profile
// @access  Private
exports.getInfluencerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('influencerProfile')
      .populate('influencerProfile.rateCards');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      influencerProfile: user.influencerProfile
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create or update influencer profile
// @route   PUT /api/influencer/profile
// @access  Private
exports.updateInfluencerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user has the Influencer role
    if (!user.roles.includes('Influencer')) {
      // Add Influencer role if not present
      user.roles.push('Influencer');
    }
    
    // Update influencer profile fields
    user.influencerProfile = {
      ...user.influencerProfile,
      isActive: req.body.isActive !== undefined ? req.body.isActive : user.influencerProfile?.isActive || false,
      bio: req.body.bio || user.influencerProfile?.bio || '',
      categories: req.body.categories || user.influencerProfile?.categories || [],
      platforms: req.body.platforms || user.influencerProfile?.platforms || [],
      totalFollowers: req.body.totalFollowers || user.influencerProfile?.totalFollowers || 0,
      avgEngagementRate: req.body.avgEngagementRate || user.influencerProfile?.avgEngagementRate || 0,
      brandsWorkedWith: req.body.brandsWorkedWith || user.influencerProfile?.brandsWorkedWith || [],
      mediaKitUrl: req.body.mediaKitUrl || user.influencerProfile?.mediaKitUrl || '',
      rateCards: user.influencerProfile?.rateCards || [],
      createdAt: user.influencerProfile?.createdAt || new Date()
    };
    
    // Add usedModules if not already present
    if (!user.usedModules.includes('influencer')) {
      user.usedModules.push('influencer');
    }
    
    const updatedUser = await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Influencer profile updated successfully',
      influencerProfile: updatedUser.influencerProfile
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all rate cards for the influencer
// @route   GET /api/influencer/rate-cards
// @access  Private
exports.getInfluencerRateCards = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('influencerProfile.rateCards')
      .populate('influencerProfile.rateCards');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      rateCards: user.influencerProfile.rateCards || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};