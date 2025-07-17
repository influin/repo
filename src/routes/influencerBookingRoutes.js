const express = require('express');
const router = express.Router();
const { 
  createInfluencerBooking,
  getClientBookings,
  getInfluencerBookings,
  getBooking,
  updateBookingStatus,
  approveContent
} = require('../controllers/influencerBookingController');
const { protectUser, requireRole } = require('../middleware/userAuth');

// Create a new booking (Seller or Tutor role required)
router.post('/', 
  protectUser, 
  requireRole('Seller', 'Tutor'), 
  createInfluencerBooking
);

// Get all bookings for the logged-in client
router.get('/client', protectUser, getClientBookings);

// Get all bookings for the logged-in influencer (Influencer role required)
router.get('/received', 
  protectUser, 
  requireRole('Influencer'), 
  getInfluencerBookings
);

// Get a single booking
router.get('/:id', protectUser, getBooking);

// Update booking status (Influencer role required)
router.put('/:id/status', 
  protectUser, 
  requireRole('Influencer'), 
  updateBookingStatus
);

// Approve content (Client)
router.put('/:id/approve', protectUser, approveContent);

module.exports = router;