const Conversation = require('../models/Conversation');
const InfluencerBooking = require('../models/InfluencerBooking');
const User = require('../models/User');

// @desc    Create a new conversation when booking is created
// @route   Internal function to be called from influencerBookingController
// @access  Private
exports.createConversationForBooking = async (booking) => {
  try {
    // Check if a conversation already exists for this booking
    const existingConversation = await Conversation.findOne({ bookingId: booking._id });
    
    if (existingConversation) {
      return existingConversation;
    }
    
    // Create a new conversation
    const conversation = await Conversation.create({
      participants: [booking.clientId, booking.influencerId],
      lastMessage: 'Booking created',
      lastMessageAt: new Date(),
      bookingId: booking._id,
      createdAt: new Date()
    });
    
    return conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

// @desc    Get all conversations for a user
// @route   GET /api/conversations
// @access  Private
exports.getUserConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'name username profileURL')
      .populate('bookingId', 'platform contentType status')
      .sort({ lastMessageAt: -1 });
    
    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single conversation
// @route   GET /api/conversations/:id
// @access  Private (Only participants)
exports.getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'name username profileURL')
      .populate('bookingId', 'platform contentType status');
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Check if user is a participant
    if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation'
      });
    }
    
    res.status(200).json({
      success: true,
      conversation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get conversation by booking ID
// @route   GET /api/conversations/booking/:bookingId
// @access  Private (Only participants)
exports.getConversationByBooking = async (req, res) => {
  try {
    const booking = await InfluencerBooking.findById(req.params.bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if user is either the client or the influencer
    if (
      booking.clientId.toString() !== req.user._id.toString() &&
      booking.influencerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }
    
    const conversation = await Conversation.findOne({ bookingId: req.params.bookingId })
      .populate('participants', 'name username profileURL')
      .populate('bookingId', 'platform contentType status');
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found for this booking'
      });
    }
    
    res.status(200).json({
      success: true,
      conversation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};