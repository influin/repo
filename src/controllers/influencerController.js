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

// @desc    Get influencer availability
// @route   GET /api/influencer/availability
// @access  Private
exports.getInfluencerAvailability = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('influencerProfile.availability influencerProfile.unavailableDates influencerProfile.workingHours');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      availability: user.influencerProfile.availability || [],
      unavailableDates: user.influencerProfile.unavailableDates || [],
      workingHours: user.influencerProfile.workingHours || {}
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update influencer availability
// @route   PUT /api/influencer/availability
// @access  Private
exports.updateInfluencerAvailability = async (req, res) => {
  try {
    const { availability, unavailableDates, workingHours } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user has the Influencer role
    if (!user.roles.includes('Influencer')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Influencer role required.' 
      });
    }
    
    // Update availability fields
    if (availability !== undefined) {
      user.influencerProfile.availability = availability;
    }
    
    if (unavailableDates !== undefined) {
      user.influencerProfile.unavailableDates = unavailableDates;
    }
    
    if (workingHours !== undefined) {
      user.influencerProfile.workingHours = workingHours;
    }
    
    const updatedUser = await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      availability: updatedUser.influencerProfile.availability,
      unavailableDates: updatedUser.influencerProfile.unavailableDates,
      workingHours: updatedUser.influencerProfile.workingHours
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add unavailable date
// @route   POST /api/influencer/availability/unavailable
// @access  Private
exports.addUnavailableDate = async (req, res) => {
  try {
    const { date, reason } = req.body;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date is required' 
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if date already exists
    const existingDate = user.influencerProfile.unavailableDates.find(
      item => new Date(item.date).toDateString() === new Date(date).toDateString()
    );
    
    if (existingDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date already marked as unavailable' 
      });
    }
    
    user.influencerProfile.unavailableDates.push({
      date: new Date(date),
      reason: reason || 'Not available'
    });
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Unavailable date added successfully',
      unavailableDates: user.influencerProfile.unavailableDates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove unavailable date
// @route   DELETE /api/influencer/availability/unavailable/:dateId
// @access  Private
exports.removeUnavailableDate = async (req, res) => {
  try {
    const { dateId } = req.params;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.influencerProfile.unavailableDates = user.influencerProfile.unavailableDates.filter(
      item => item._id.toString() !== dateId
    );
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Unavailable date removed successfully',
      unavailableDates: user.influencerProfile.unavailableDates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get available slots for a specific date
// @route   GET /api/influencer/availability/slots/:date
// @access  Public
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.params;
    const { influencerId } = req.query;
    
    if (!influencerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Influencer ID is required' 
      });
    }
    
    const user = await User.findById(influencerId)
      .select('influencerProfile.availability influencerProfile.unavailableDates influencerProfile.workingHours');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Influencer not found' });
    }
    
    const requestedDate = new Date(date);
    const dayName = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Check if date is marked as unavailable
    const isUnavailable = user.influencerProfile.unavailableDates.some(
      item => new Date(item.date).toDateString() === requestedDate.toDateString()
    );
    
    if (isUnavailable) {
      return res.status(200).json({
        success: true,
        date,
        dayName,
        availableSlots: [],
        message: 'Influencer is not available on this date'
      });
    }
    
    // Get slots for the specific day
    const dayAvailability = user.influencerProfile.availability.find(
      item => item.day.toLowerCase() === dayName.toLowerCase()
    );
    
    const availableSlots = dayAvailability ? dayAvailability.slots : [];
    
    res.status(200).json({
      success: true,
      date,
      dayName,
      availableSlots,
      timezone: user.influencerProfile.workingHours?.timezone || 'Asia/Kolkata'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all influencers except current user
// @route   GET /api/influencer/all
// @access  Private
exports.getAllInfluencers = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, platform, minFollowers, maxFollowers, search } = req.query;
    
    // Build query to find users with Influencer role, excluding current user
    let query = {
      _id: { $ne: req.user._id }, // Exclude current user
      roles: 'Influencer',
      'influencerProfile.isActive': true,
      status: 'active'
    };
    
    // Add filters if provided
    if (category) {
      query['influencerProfile.categories'] = { $in: [category] };
    }
    
    if (platform) {
      query['influencerProfile.platforms'] = { $in: [platform] };
    }
    
    if (minFollowers || maxFollowers) {
      query['influencerProfile.totalFollowers'] = {};
      if (minFollowers) {
        query['influencerProfile.totalFollowers'].$gte = parseInt(minFollowers);
      }
      if (maxFollowers) {
        query['influencerProfile.totalFollowers'].$lte = parseInt(maxFollowers);
      }
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { 'influencerProfile.bio': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get influencers with pagination
    const influencers = await User.find(query)
      .select('name username profileURL influencerProfile')
      .populate('influencerProfile.rateCards', 'platform contentType price')
      .sort({ 'influencerProfile.totalFollowers': -1 }) // Sort by followers descending
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalInfluencers = await User.countDocuments(query);
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalInfluencers / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      success: true,
      count: influencers.length,
      totalInfluencers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      },
      data: influencers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single influencer profile by ID (public view)
// @route   GET /api/influencer/:id
// @access  Private
exports.getInfluencerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find influencer by ID, excluding current user
    const influencer = await User.findOne({
      _id: id,
      _id: { $ne: req.user._id }, // Exclude current user
      roles: 'Influencer',
      'influencerProfile.isActive': true,
      status: 'active'
    })
    .select('name username profileURL influencerProfile')
    .populate('influencerProfile.rateCards');
    
    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: 'Influencer not found or not available'
      });
    }
    
    res.status(200).json({
      success: true,
      data: influencer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get influencers by category
// @route   GET /api/influencer/category/:categoryName
// @access  Private
exports.getInfluencersByCategory = async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const query = {
      _id: { $ne: req.user._id },
      roles: 'Influencer',
      'influencerProfile.isActive': true,
      'influencerProfile.categories': { $in: [categoryName] },
      status: 'active'
    };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const influencers = await User.find(query)
      .select('name username profileURL influencerProfile')
      .populate('influencerProfile.rateCards', 'platform contentType price')
      .sort({ 'influencerProfile.totalFollowers': -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalInfluencers = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      category: categoryName,
      count: influencers.length,
      totalInfluencers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalInfluencers / parseInt(limit)),
        hasNextPage: parseInt(page) < Math.ceil(totalInfluencers / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1
      },
      data: influencers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};