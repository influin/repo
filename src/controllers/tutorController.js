const User = require('../models/User');

// @desc    Get tutor profile
// @route   GET /api/tutor/profile
// @access  Private
exports.getTutorProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('tutorProfile');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      tutorProfile: user.tutorProfile
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create or update tutor profile
// @route   PUT /api/tutor/profile
// @access  Private
exports.updateTutorProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user has the Tutor role
    if (!user.roles.includes('Tutor')) {
      // Add Tutor role if not present
      user.roles.push('Tutor');
    }
    
    // Update tutor profile fields
    user.tutorProfile = {
      ...user.tutorProfile,
      isApproved: user.tutorProfile?.isApproved || false, // Only admins can approve tutors
      bio: req.body.bio || user.tutorProfile?.bio || '',
      subjects: req.body.subjects || user.tutorProfile?.subjects || [],
      hourlyRate: req.body.hourlyRate || user.tutorProfile?.hourlyRate || 0,
      experienceYears: req.body.experienceYears || user.tutorProfile?.experienceYears || 0,
      languagesSpoken: req.body.languagesSpoken || user.tutorProfile?.languagesSpoken || [],
      rating: user.tutorProfile?.rating || 0, // Rating should be calculated based on reviews
      classesConducted: user.tutorProfile?.classesConducted || 0, // This should be updated when classes are conducted
      availability: req.body.availability || user.tutorProfile?.availability || [],
      createdAt: user.tutorProfile?.createdAt || new Date()
    };
    
    // Add usedModules if not already present
    if (!user.usedModules.includes('tutor')) {
      user.usedModules.push('tutor');
    }
    
    const updatedUser = await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Tutor profile updated successfully',
      tutorProfile: updatedUser.tutorProfile
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin approve tutor profile
// @route   PUT /api/tutor/approve/:userId
// @access  Private (Admin only)
exports.approveTutorProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!user.tutorProfile) {
      return res.status(400).json({ success: false, message: 'User does not have a tutor profile' });
    }
    
    // Update approval status
    user.tutorProfile.isApproved = true;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Tutor profile approved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update tutor availability
// @route   PUT /api/tutor/availability
// @access  Private
exports.updateTutorAvailability = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!user.tutorProfile) {
      return res.status(400).json({ success: false, message: 'Tutor profile not found' });
    }
    
    // Update availability
    user.tutorProfile.availability = req.body.availability || [];
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Tutor availability updated successfully',
      availability: user.tutorProfile.availability
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};