const express = require('express');
const router = express.Router();
const { 
  createProduct, 
  getProducts, 
  getProduct, 
  updateProduct, 
  deleteProduct, 
  getUserProducts 
} = require('../controllers/productController');
const { protectUser, requireRole } = require('../middleware/userAuth');
const { uploadImage } = require('../../config/cloudinary');

// Configure upload middleware for product images
const uploadProductImages = uploadImage.fields([
  { name: 'images', maxCount: 5 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Process uploaded files and add URLs to request body
const processProductImages = (req, res, next) => {
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
router.get('/', getProducts);
router.get('/:id', getProduct);

// Protected routes - Seller role required
router.post('/', protectUser, requireRole('Seller'), uploadProductImages, processProductImages, createProduct);
router.put('/:id', protectUser, requireRole('Seller'), uploadProductImages, processProductImages, updateProduct);
router.delete('/:id', protectUser, requireRole('Seller'), deleteProduct);
router.get('/user/products', protectUser, getUserProducts);

module.exports = router;