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

// All routes are protected and require admin access
router.use(protect);
router.use(authorize('superadmin', 'moderator'));

// Get category tree
router.get('/tree', getCategoryTree);

// CRUD routes with file upload middleware
router
  .route('/')
  .post(uploadCategoryImages, processUploadedFiles, createCategory)
  .get(getCategories);

router
  .route('/:id')
  .get(getCategory)
  .put(uploadCategoryImages, processUploadedFiles, updateCategory)
  .delete(deleteCategory);

module.exports = router;