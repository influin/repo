const express = require('express');
const router = express.Router();
const { 
  getUserConversations,
  getConversation,
  getConversationByBooking
} = require('../controllers/conversationController');
const {
  sendMessage,
  getMessages,
  markAsRead
} = require('../controllers/messageController');
const { protectUser } = require('../middleware/userAuth');

// All routes are protected
router.use(protectUser);

// Conversation routes
router.get('/', getUserConversations);
router.get('/:id', getConversation);
router.get('/booking/:bookingId', getConversationByBooking);

// Message routes
router.post('/:conversationId/messages', sendMessage);
router.get('/:conversationId/messages', getMessages);
router.put('/:conversationId/read', markAsRead);

module.exports = router;