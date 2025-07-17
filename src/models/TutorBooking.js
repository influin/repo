const mongoose = require('mongoose');

const TutorBookingSchema = new mongoose.Schema({
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subject: String,
  schedule: { day: String, from: String, to: String },
  status: { type: String, enum: ['booked', 'completed', 'cancelled'], default: 'booked' },
  amount: Number,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TutorBooking', TutorBookingSchema);