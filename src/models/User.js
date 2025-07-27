const mongoose = require('mongoose');
const { Schema } = mongoose;

const SlotSchema = new Schema({
  from: String,
  to: String,
});

const AvailabilitySchema = new Schema({
  day: String,
  slots: [SlotSchema],
});

// Define a schema for store items (products/services) that can be from other users
const StoreItemSchema = new Schema({
  itemType: { type: String, enum: ['product', 'service'], required: true },
  itemId: { 
    type: Schema.Types.ObjectId, 
    refPath: 'itemType', // Dynamic reference based on itemType
    required: true 
  },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User' }, // Original owner of the product/service
  affiliateCommission: { type: Number, default: 0 }, // Commission percentage for affiliate
  myearning: { type: Number, default: 0 } // Commission earned by the affiliate
});

// Define a schema for stores
const StoreSchema = new Schema({
  isActive: { type: Boolean, default: false },
  storeType: { type: String, enum: ['product', 'service', 'both', 'affiliate'] },
  storeName: { type: String, required: true },
  bannerImage: String,
  description: String,
  categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }], // Reference to Category model
  items: [StoreItemSchema], // Products/Services in this store (own or affiliate)
  rating: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new Schema({
  // 🔹 Basic Info
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  gender: { type: String },
  dob: { type: String },
  phoneNumber: { type: String, required: true, unique: true },
  profileURL: { type: String },
  
  // 🔹 User Type (from first screen)
  userType: { 
    type: String, 
    enum: ['Individual', 'Organisation'],
    required: true 
  },
  
  // 🔹 User Roles (from second screen - multiple selections)
  userRoles: { 
    type: [String], 
    enum: ['Store Owner', 'Service Business Owner', 'Course Provider', 'Influencer or Content Creator', 'Student or Working Professional', 'Delivery Partner'],
    required: true 
  },
  kyc: {
    aadhaar: {
      number: { type: String, unique: true, sparse: true },
      isVerified: { type: Boolean, default: false },
      verificationStatus: { 
        type: String, 
        enum: ['pending', 'verified', 'failed'], 
        default: 'pending' 
      },
      verifiedAt: Date
    },
    pan: {
      number: { type: String, unique: true, sparse: true },
      name: String,
      dateOfBirth: String,
      isVerified: { type: Boolean, default: false },
      verificationStatus: { 
        type: String, 
        enum: ['pending', 'verified', 'failed'], 
        default: 'pending' 
      },
      verifiedAt: Date
    }
  },
  // 🔹 Roles (existing field - will be mapped from userRoles)
  roles: {
    type: [String],
    enum: ['Influencer', 'Service Provider', 'Seller', 'Tutor', 'user'],
    default: ['user'],
  },
  wallet: {
    balance: { type: Number, default: 0 },
    pendingPayouts: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalPaidOut: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  // 🔹 Social Media Connections
  socialAccounts: {
    instagram: {
      username: String,
      accountId: String,
      profilePicUrl: String,
      accessToken: String,
      expiresAt: Date,
      connectedAt: Date,
    },
    facebook: {
      username: String,
      pageId: String,
      accessToken: String,
      expiresAt: Date,
      connectedAt: Date,
    },
    youtube: {
      channelId: String,
      channelName: String,
      thumbnailUrl: String,
      accessToken: String,
      refreshToken: String,
      expiresAt: Date,
      connectedAt: Date,
    },
    tiktok: {
      username: String,
      userId: String,
      accessToken: String,
      expiresAt: Date,
      connectedAt: Date,
    },
    linkedin: {
      profileId: String,
      accessToken: String,
      expiresAt: Date,
      connectedAt: Date,
    },
  },

  // 🔹 Stores - Changed from single store to array of stores
  stores: [StoreSchema],

  // 🔹 Tutor Profile
  tutorProfile: {
    isApproved: { type: Boolean, default: false },
    bio: String,
    subjects: [String],
    hourlyRate: Number,
    experienceYears: Number,
    languagesSpoken: [String],
    rating: Number,
    classesConducted: Number,
    availability: [AvailabilitySchema],
    createdAt: Date,
  },

  // 🔹 Influencer Profile
  influencerProfile: {
    isActive: { type: Boolean, default: false },
    bio: String,
    categories: [String],         // e.g., ['Fashion', 'Tech']
    platforms: [String],          // ['Instagram', 'YouTube']
    totalFollowers: Number,
    avgEngagementRate: Number,
    brandsWorkedWith: [String],
    mediaKitUrl: String,
    rateCards: [{                 // Reference to RateCard model
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RateCard'
    }],
    createdAt: Date,
  },

  // 🔹 Subscription Information
  subscription: {
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    paymentStatus: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Completed' },
    autoRenew: { type: Boolean, default: false }
  },
  
  // 🔹 Usage Tracking
  usedModules: [String], // ['store', 'tutor', 'social_media', 'influencer']

  // 🔹 Admin and Metadata
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active',
  },

  // For authentication
  passwordHash: { type: String },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, {
  timestamps: true, // adds createdAt & updatedAt
});

module.exports = mongoose.model('User', UserSchema);
