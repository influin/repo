const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('../config/db');
const adminRoutes = require('./routes/adminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const storeRoutes = require('./routes/storeRoutes');
const rateCardRoutes = require('./routes/rateCardRoutes');
const influencerRoutes = require('./routes/influencerRoutes');
const socialRoutes = require('./routes/socialRoutes');
const tutorRoutes = require('./routes/tutorRoutes');
const courseRoutes = require('./routes/courseRoutes'); // Add this line
const subscriptionPlanRoutes = require('./routes/subscriptionPlanRoutes');
const influencerBookingRoutes = require('./routes/influencerBookingRoutes');

const app = express();

// Middleware
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/users/stores', storeRoutes);
app.use('/api/ratecards', rateCardRoutes);
app.use('/api/influencer', influencerRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/courses', courseRoutes); // Add this line
app.use('/api/admin/subscription-plans', subscriptionPlanRoutes);

// Add with other route imports
const publicSubscriptionRoutes = require('./routes/publicSubscriptionRoutes');

// Add with other route uses
app.use('/api/subscription-plans', publicSubscriptionRoutes);

// Add the new routes
app.use('/api/bookings/influencer', influencerBookingRoutes);

// Add this with your other route imports
const conversationRoutes = require('./routes/conversationRoutes');

// Add this with your other route uses
app.use('/api/conversations', conversationRoutes);

// Add this with your other route imports
const walletRoutes = require('./routes/walletRoutes');

// Add this with your other route uses
app.use('/api/wallet', walletRoutes);

// Add these with your other route imports
const cartRoutes = require('./routes/cartRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');

// Add these with your other route uses
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Influencer Backend API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});