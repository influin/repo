const express = require('express');
const router = express.Router();
const { 
  createStore, 
  getUserStores, 
  getStoreById, 
  updateStore, 
  deleteStore, 
  addItemToStore, 
  removeItemFromStore,
  updateItemInStore
} = require('../controllers/storeController');
const { protectUser } = require('../middleware/userAuth');
const { uploadImage } = require('../../config/cloudinary');

// Configure upload middle ware for store banner image
const uploadBannerImage = uploadImage.single('bannerImage');

// All routes are protected
router.post('/', protectUser, uploadBannerImage, createStore);
router.get('/', protectUser, getUserStores);
router.get('/:storeId', protectUser, getStoreById);
router.put('/:storeId', protectUser, uploadBannerImage, updateStore);
router.delete('/:storeId', protectUser, deleteStore);

// Store items routes
router.post('/:storeId/items', protectUser, addItemToStore);
router.delete('/:storeId/items/:itemId', protectUser, removeItemFromStore);
router.put('/:storeId/items/:itemId', protectUser, updateItemInStore); // Add this line

module.exports = router;