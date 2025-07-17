const mongoose = require('mongoose');

const ServiceBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  bookingDate: Date,
  timeSlot: { from: String, to: String },
  address: String,
  status: { type: String, enum: ['pending', 'confirmed', 'completed'], default: 'pending' },
  amount: Number,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ServiceBooking', ServiceBookingSchema);