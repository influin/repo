const mongoose = require('mongoose');
const { Schema } = mongoose;

const ServiceSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  title: { type: String, required: true },
  description: { type: String },

  basePrice: { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  subCategory: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
  },
  tags: [String],

  images: [String],
  thumbnail: { type: String },

  duration: { type: String }, // e.g., "30 min", "1 hour"
  locationType: {
    type: String,
    enum: ['online', 'offline', 'both'],
    default: 'online',
  },

  serviceArea: {
    city: String,
    pincode: String,
    radiusInKm: Number,
  },

  availability: [{
    day: String, // e.g., "Monday"
    slots: [{
      from: String, // "10:00"
      to: String    // "11:00"
    }]
  }],

  isBookable: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  rating: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt field on save
ServiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Service', ServiceSchema);