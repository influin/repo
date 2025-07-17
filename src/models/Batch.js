const mongoose = require('mongoose');
const { Schema } = mongoose;

const BatchSchema = new Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: true }, // e.g., "Evening Batch - June 2023"
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  enrollmentEndDate: { type: Date, required: true },
  maxStudents: { type: Number, required: true },
  currentEnrollments: { type: Number, default: 0 },
  price: { type: Number, required: true }, // This can be different from course base price
  discountPercentage: { type: Number, default: 0 }, // 0-100
  discountReason: String, // e.g., "Early bird offer", "Summer special"
  classSchedule: [{
    day: { type: String, required: true }, // e.g., "Monday", "Tuesday"
    startTime: { type: String, required: true }, // e.g., "18:00"
    endTime: { type: String, required: true }, // e.g., "20:00"
    timeZone: { type: String, default: 'UTC' }
  }],
  classMode: { 
    type: String, 
    enum: ['Online', 'Offline', 'Hybrid'],
    required: true
  },
  onlineDetails: {
    platform: String, // e.g., "Zoom", "Google Meet"
    meetingLink: String,
    meetingId: String,
    password: String
  },
  offlineDetails: {
    location: String,
    address: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  isActive: { type: Boolean, default: true },
  enrolledStudents: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrollmentDate: { type: Date, default: Date.now },
    paymentStatus: { 
      type: String, 
      enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
      default: 'Pending'
    },
    amountPaid: Number
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Virtual for calculating the effective price after discount
BatchSchema.virtual('effectivePrice').get(function() {
  if (!this.discountPercentage) return this.price;
  return this.price - (this.price * (this.discountPercentage / 100));
});

// Virtual for calculating available seats
BatchSchema.virtual('availableSeats').get(function() {
  return this.maxStudents - this.currentEnrollments;
});

// Ensure virtuals are included when converting to JSON
BatchSchema.set('toJSON', { virtuals: true });
BatchSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Batch', BatchSchema);