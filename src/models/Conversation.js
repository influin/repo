const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  ],
  lastMessage: { type: String },
  lastMessageAt: { type: Date },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'InfluencerBooking', default: null }, // Optional link to context
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Conversation', ConversationSchema);
 