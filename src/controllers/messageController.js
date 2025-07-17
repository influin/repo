const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// @desc    Send a new message
// @route   POST /api/conversations/:conversationId/messages
// @access  Private (Only participants)
exports.sendMessage = async (req, res) => {
  try {
    const { text, attachments } = req.body;
    const { conversationId } = req.params;
    
    if (!text && (!attachments || attachments.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Message text or attachments are required'
      });
    }
    
    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Check if user is a participant
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this conversation'
      });
    }
    
    // Create the message
    const message = await Message.create({
      conversationId,
      sender: req.user._id,
      text: text || '',
      attachments: attachments || [],
      readBy: [req.user._id], // Sender has read the message
      createdAt: new Date()
    });
    
    // Update the conversation's last message and timestamp
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text || 'Attachment',
      lastMessageAt: new Date()
    });
    
    // Populate sender information
    await message.populate('sender', 'name username profileURL');
    
    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/conversations/:conversationId/messages
// @access  Private (Only participants)
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Check if user is a participant
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view messages in this conversation'
      });
    }
    
    // Get messages
    const messages = await Message.find({ conversationId })
      .populate('sender', 'name username profileURL')
      .sort({ createdAt: 1 });
    
    // Mark messages as read
    await Message.updateMany(
      { 
        conversationId,
        sender: { $ne: req.user._id }, // Not sent by current user
        readBy: { $ne: req.user._id } // Not already read by current user
      },
      { $push: { readBy: req.user._id } }
    );
    
    res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/conversations/:conversationId/read
// @access  Private (Only participants)
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Check if user is a participant
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation'
      });
    }
    
    // Mark all messages as read
    await Message.updateMany(
      { 
        conversationId,
        readBy: { $ne: req.user._id } // Not already read by current user
      },
      { $push: { readBy: req.user._id } }
    );
    
    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};