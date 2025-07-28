const express = require('express');
const router = express.Router();
const {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const { uploadCategoryImages, processUploadedFiles } = require('../middleware/upload');

// Public routes (no authentication required)
router.get('/', getCategories);
router.get('/tree', getCategoryTree);
router.get('/:id', getCategory);

// Protected routes (require admin access)
router.use(protect);
router.use(authorize('superadmin', 'moderator'));

// Admin-only routes
router.post('/', uploadCategoryImages, processUploadedFiles, createCategory);
router.put('/:id', uploadCategoryImages, processUploadedFiles, updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;