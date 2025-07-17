const express = require('express');
const router = express.Router();
const { 
  createService, 
  getServices, 
  getService, 
  updateService, 
  deleteService, 
  getUserServices 
} = require('../controllers/serviceController');
const { protectUser, requireRole } = require('../middleware/userAuth');
const { uploadImage } = require('../../config/cloudinary');

// Configure upload middleware for service images
const uploadServiceImages = uploadImage.fields([
  { name: 'images', maxCount: 5 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Process uploaded files and add URLs to request body
const processServiceImages = (req, res, next) => {
  if (req.files) {
    // Process thumbnail
    if (req.files.thumbnail && req.files.thumbnail[0]) {
      req.body.thumbnail = req.files.thumbnail[0].path;
    }
    
    // Process images
    if (req.files.images) {
      req.body.images = req.files.images.map(file => file.path);
    }
  }
  
  next();
};

// Public routes
router.get('/', getServices);
router.get('/:id', getService);

// Protected routes - Service Provider role required
router.post('/', protectUser, requireRole('Seller'), uploadServiceImages, processServiceImages, createService);
router.put('/:id', protectUser, requireRole('Service Provider'), uploadServiceImages, processServiceImages, updateService);
router.delete('/:id', protectUser, requireRole('Service Provider'), deleteService);
router.get('/user/services', protectUser, getUserServices);

module.exports = router;