const mongoose = require('mongoose'); 
 
const InfluencerBookingSchema = new mongoose.Schema({ 
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },      // Who booked 
  influencerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // Who is being booked 
  rateCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'RateCard' }, 
   
  platform: String,       // e.g., Instagram 
  contentType: String,    // e.g., Story, Reel 
 
  amountPaid: Number, 
  currency: { type: String, default: 'INR' }, 
 
  status: { 
    type: String, 
    enum: ['booked', 'delivered', 'draft', 'approved', 'posted', 'paid'], 
    default: 'booked', 
  }, 
 
  contentDraftUrl: String, // Content shared by influencer before approval 
  postedAt: Date,          // Final post date 
  clientApprovalDate: Date, 
 
  createdAt: { type: Date, default: Date.now }, 
}); 
 
module.exports = mongoose.model('InfluencerBooking', InfluencerBookingSchema);