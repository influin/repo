const mongoose = require('mongoose'); 
 
const WalletTransactionSchema = new mongoose.Schema({ 
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  amount: Number, 
  type: { type: String, enum: ['credit', 'debit'] }, 
  source: { type: String, enum: ['influencer_post', 'refund', 'admin'] }, 
  linkedBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'InfluencerBooking' }, 
  timestamp: { type: Date, default: Date.now }, 
}); 
 
module.exports = mongoose.model('WalletTransaction', WalletTransactionSchema);