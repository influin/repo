const InfluencerBooking = require('../models/InfluencerBooking');
const User = require('../models/User');
const RateCard = require('../models/RateCard');
const WalletTransaction = require('../models/WalletTransaction'); // Add this line

// @desc    Create a new influencer booking
// @route   POST /api/bookings/influencer
// @access  Private (Seller or Tutor role)
exports.createInfluencerBooking = async (req, res) => {
  try {
    const { influencerId, rateCardId, platform, contentType } = req.body;
    
    // Validate required fields
    if (!influencerId || !rateCardId || !platform || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Check if influencer exists and has Influencer role
    const influencer = await User.findById(influencerId);
    if (!influencer || !influencer.roles.includes('Influencer')) {
      return res.status(404).json({
        success: false,
        message: 'Influencer not found or user is not an influencer'
      });
    }
    
    // Check if rate card exists and belongs to the influencer
    const rateCard = await RateCard.findById(rateCardId);
    if (!rateCard || rateCard.userId.toString() !== influencerId) {
      return res.status(404).json({
        success: false,
        message: 'Rate card not found or does not belong to this influencer'
      });
    }
    
    // Check if platform and content type match the rate card
    if (rateCard.platform !== platform || rateCard.contentType !== contentType) {
      return res.status(400).json({
        success: false,
        message: 'Platform or content type does not match the selected rate card'
      });
    }
    
    // Create the booking
    const booking = await InfluencerBooking.create({
      clientId: req.user._id,
      influencerId,
      rateCardId,
      platform,
      contentType,
      amountPaid: rateCard.price.amount, // Extract just the amount from the price object
      currency: rateCard.price.currency || 'INR',
      status: 'booked',
      createdAt: new Date()
    });
    
    // Add amount to influencer's wallet as pending payout
    await User.findByIdAndUpdate(influencerId, {
      $inc: {
        'wallet.pendingPayouts': rateCard.price.amount,
        'wallet.totalEarned': rateCard.price.amount
      },
      $set: { 'wallet.lastUpdated': new Date() }
    });
    
    // Add this import at the top of the file
    const { createConversationForBooking } = require('./conversationController');
    
    // Inside the createInfluencerBooking function, after creating the booking and before sending the response:
    // Create wallet transaction record
    await WalletTransaction.create({
      userId: influencerId,
      amount: rateCard.price.amount,
      type: 'credit',
      source: 'influencer_post',
      linkedBooking: booking._id,
      timestamp: new Date()
    });
    
    // Create a conversation between client and influencer
    await createConversationForBooking(booking);
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all bookings for a client
// @route   GET /api/bookings/influencer/client
// @access  Private
exports.getClientBookings = async (req, res) => {
  try {
    const bookings = await InfluencerBooking.find({ clientId: req.user._id })
      .populate('influencerId', 'name username profileURL')
      .populate('rateCardId')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all bookings for an influencer
// @route   GET /api/bookings/influencer/received
// @access  Private (Influencer role)
exports.getInfluencerBookings = async (req, res) => {
  try {
    const bookings = await InfluencerBooking.find({ influencerId: req.user._id })
      .populate('clientId', 'name username profileURL')
      .populate('rateCardId')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single booking
// @route   GET /api/bookings/influencer/:id
// @access  Private (Client or Influencer involved in the booking)
exports.getBooking = async (req, res) => {
  try {
    const booking = await InfluencerBooking.findById(req.params.id)
      .populate('clientId', 'name username profileURL')
      .populate('influencerId', 'name username profileURL')
      .populate('rateCardId');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if user is either the client or the influencer
    if (
      booking.clientId._id.toString() !== req.user._id.toString() &&
      booking.influencerId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }
    
    res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/influencer/:id/status
// @access  Private (varies by role)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a status'
      });
    }
    
    // Find the booking
    const booking = await InfluencerBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check permissions based on role and booking relationship
    if (req.user.roles.includes('Influencer')) {
      // Influencers can only update their own bookings
      if (booking.influencerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this booking'
        });
      }
    } else {
      // Clients can only update their own bookings
      if (booking.clientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this booking'
        });
      }
    }
    
    // Handle wallet updates when status changes to 'paid'
    const oldStatus = booking.status;
    if (status === 'paid' && oldStatus !== 'paid') {
      // Move amount from pendingPayouts to balance
      await User.findByIdAndUpdate(booking.influencerId, {
        $inc: {
          'wallet.balance': booking.amountPaid,
          'wallet.pendingPayouts': -booking.amountPaid
        },
        $set: { 'wallet.lastUpdated': new Date() }
      });
      
      // Create wallet transaction record for the payment
      await WalletTransaction.create({
        userId: booking.influencerId,
        amount: booking.amountPaid,
        type: 'credit',
        source: 'influencer_post',
        linkedBooking: booking._id,
        timestamp: new Date()
      });
    }
    
    // Update the booking status
    booking.status = status;
    if (status === 'posted') {
      booking.postedAt = new Date();
    }
    await booking.save();
    
    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Client approves content draft
// @route   PUT /api/bookings/influencer/:id/approve
// @access  Private (Client involved in the booking)
exports.approveContent = async (req, res) => {
  try {
    // Find booking
    const booking = await InfluencerBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if user is the client
    if (booking.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve this booking'
      });
    }
    
    // Check if booking is in draft status
    if (booking.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only approve bookings in draft status'
      });
    }
    
    // Update status and approval date
    booking.status = 'approved';
    booking.clientApprovalDate = new Date();
    
    await booking.save();
    
    res.status(200).json({
      success: true,
      message: 'Content approved successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};