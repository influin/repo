const User = require('../models/User');
const Product = require('../models/Product');
const Service = require('../models/Service');
const Category = require('../models/Category');
const { cloudinary } = require('../../config/cloudinary');

// @desc    Create a new store for a user
// @route   POST /api/users/stores
// @access  Private
exports.createStore = async (req, res) => {
  try {
    const { storeName, storeType, description, categories } = req.body;
    
    if (!storeName || !storeType) {
      return res.status(400).json({ success: false, message: 'Store name and type are required' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Validate categories if provided
    if (categories && categories.length > 0) {
      for (const categoryId of categories) {
        const categoryExists = await Category.findById(categoryId);
        if (!categoryExists) {
          return res.status(400).json({ 
            success: false, 
            message: `Category with ID ${categoryId} not found` 
          });
        }
      }
    }
    
    // Create new store object
    const newStore = {
      storeName,
      storeType,
      isActive: true,
      items: [],
      createdAt: Date.now()
    };
    
    // Add optional fields if provided
    if (description) newStore.description = description;
    if (categories) newStore.categories = categories;
    
    // Handle banner image upload if provided
    if (req.file && req.file.path) {
      newStore.bannerImage = req.file.path;
    }
    
    // Check if this is the user's first store and add 'Seller' role if it is
    if (!user.roles.includes('Seller')) {
      user.roles.push('Seller');
    }
    
    // Add store to user's stores array
    user.stores.push(newStore);
    await user.save();
    
    // Return the newly created store
    const createdStore = user.stores[user.stores.length - 1];
    
    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      store: createdStore
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all stores for a user
// @route   GET /api/users/stores
// @access  Private
exports.getUserStores = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'stores.categories',
        select: 'name slug'
      });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      stores: user.stores || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a specific store by ID with full population
// @route   GET /api/users/stores/:storeId
// @access  Private
exports.getStoreById = async (req, res) => {
  try {
    const { storeId } = req.params;
    
    // Find user and populate store data with all related information
    const user = await User.findById(req.user._id)
      .populate({
        path: 'stores.categories',
        select: 'name slug type icon image isActive'
      })
      .populate({
        path: 'stores.items.itemId',
        populate: [
          {
            path: 'category',
            select: 'name slug type icon image'
          },
          {
            path: 'subCategory', 
            select: 'name slug type icon image'
          },
          {
            path: 'userId',
            select: 'name username profileURL'
          }
        ]
      })
      .populate({
        path: 'stores.items.ownerId',
        select: 'name username profileURL'
      });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const store = user.stores.id(storeId);
    
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    
    // Transform the store data to include all populated information
    const storeData = {
      _id: store._id,
      storeName: store.storeName,
      storeType: store.storeType,
      description: store.description,
      bannerImage: store.bannerImage,
      isActive: store.isActive,
      rating: store.rating,
      totalSales: store.totalSales,
      createdAt: store.createdAt,
      
      // Populated categories with full details
      categories: store.categories.map(category => ({
        _id: category._id,
        name: category.name,
        slug: category.slug,
        type: category.type,
        icon: category.icon,
        image: category.image,
        isActive: category.isActive
      })),
      
      // Populated items with full details
      items: store.items.map(item => {
        const itemData = {
          _id: item._id,
          itemType: item.itemType,
          affiliateCommission: item.affiliateCommission,
          myearning: item.myearning,
          
          // Owner information
          owner: item.ownerId ? {
            _id: item.ownerId._id,
            name: item.ownerId.name,
            username: item.ownerId.username,
            profileURL: item.ownerId.profileURL
          } : null,
          
          // Item details (product or service)
          itemDetails: null
        };
        
        // Add item-specific details based on type
        if (item.itemId) {
          if (item.itemType === 'product') {
            itemData.itemDetails = {
              _id: item.itemId._id,
              title: item.itemId.title,
              description: item.itemId.description,
              price: item.itemId.price,
              currency: item.itemId.currency,
              images: item.itemId.images || [],
              thumbnail: item.itemId.thumbnail,
              inventory: item.itemId.inventory,
              sku: item.itemId.sku,
              tags: item.itemId.tags || [],
              isActive: item.itemId.isActive,
              isFeatured: item.itemId.isFeatured,
              rating: item.itemId.rating,
              totalSales: item.itemId.totalSales,
              shipping: item.itemId.shipping,
              
              // Category details
              category: item.itemId.category ? {
                _id: item.itemId.category._id,
                name: item.itemId.category.name,
                slug: item.itemId.category.slug,
                type: item.itemId.category.type,
                icon: item.itemId.category.icon,
                image: item.itemId.category.image
              } : null,
              
              // Subcategory details
              subCategory: item.itemId.subCategory ? {
                _id: item.itemId.subCategory._id,
                name: item.itemId.subCategory.name,
                slug: item.itemId.subCategory.slug,
                type: item.itemId.subCategory.type,
                icon: item.itemId.subCategory.icon,
                image: item.itemId.subCategory.image
              } : null,
              
              // Item owner details
              itemOwner: item.itemId.userId ? {
                _id: item.itemId.userId._id,
                name: item.itemId.userId.name,
                username: item.itemId.userId.username,
                profileURL: item.itemId.userId.profileURL
              } : null,
              
              createdAt: item.itemId.createdAt,
              updatedAt: item.itemId.updatedAt
            };
          } else if (item.itemType === 'service') {
            itemData.itemDetails = {
              _id: item.itemId._id,
              title: item.itemId.title,
              description: item.itemId.description,
              basePrice: item.itemId.basePrice,
              currency: item.itemId.currency,
              images: item.itemId.images || [],
              thumbnail: item.itemId.thumbnail,
              tags: item.itemId.tags || [],
              duration: item.itemId.duration,
              locationType: item.itemId.locationType,
              serviceArea: item.itemId.serviceArea,
              availability: item.itemId.availability || [],
              isBookable: item.itemId.isBookable,
              isFeatured: item.itemId.isFeatured,
              isActive: item.itemId.isActive,
              rating: item.itemId.rating,
              totalBookings: item.itemId.totalBookings,
              
              // Category details
              category: item.itemId.category ? {
                _id: item.itemId.category._id,
                name: item.itemId.category.name,
                slug: item.itemId.category.slug,
                type: item.itemId.category.type,
                icon: item.itemId.category.icon,
                image: item.itemId.category.image
              } : null,
              
              // Subcategory details
              subCategory: item.itemId.subCategory ? {
                _id: item.itemId.subCategory._id,
                name: item.itemId.subCategory.name,
                slug: item.itemId.subCategory.slug,
                type: item.itemId.subCategory.type,
                icon: item.itemId.subCategory.icon,
                image: item.itemId.subCategory.image
              } : null,
              
              // Item owner details
              itemOwner: item.itemId.userId ? {
                _id: item.itemId.userId._id,
                name: item.itemId.userId.name,
                username: item.itemId.userId.username,
                profileURL: item.itemId.userId.profileURL
              } : null,
              
              createdAt: item.itemId.createdAt,
              updatedAt: item.itemId.updatedAt
            };
          }
        }
        
        return itemData;
      })
    };
    
    res.status(200).json({
      success: true,
      store: storeData
    });
  } catch (error) {
    console.error('Error fetching store details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a store
// @route   PUT /api/users/stores/:storeId
// @access  Private
exports.updateStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { storeName, storeType, description, isActive, categories } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const store = user.stores.id(storeId);
    
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    
    // Validate categories if provided
    if (categories && categories.length > 0) {
      for (const categoryId of categories) {
        const categoryExists = await Category.findById(categoryId);
        if (!categoryExists) {
          return res.status(400).json({ 
            success: false, 
            message: `Category with ID ${categoryId} not found` 
          });
        }
      }
    }
    
    // Update store fields
    if (storeName) store.storeName = storeName;
    if (storeType) store.storeType = storeType;
    if (description !== undefined) store.description = description;
    if (isActive !== undefined) store.isActive = isActive;
    if (categories) store.categories = categories;
    
    // Handle banner image update if provided
    if (req.file && req.file.path) {
      // Delete old banner image from Cloudinary if exists
      if (store.bannerImage && store.bannerImage.includes('cloudinary')) {
        const publicId = store.bannerImage.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
      
      store.bannerImage = req.file.path;
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Store updated successfully',
      store
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a store
// @route   DELETE /api/users/stores/:storeId
// @access  Private
exports.deleteStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const store = user.stores.id(storeId);
    
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    
    // Delete banner image from Cloudinary if exists
    if (store.bannerImage && store.bannerImage.includes('cloudinary')) {
      const publicId = store.bannerImage.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }
    
    // Remove store from user's stores array
    user.stores.pull(storeId);
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add item to store (product, service, or affiliate)
// @route   POST /api/users/stores/:storeId/items
// @access  Private
exports.addItemToStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { itemType, itemId, affiliateCommission } = req.body;
    
    if (!itemType || !itemId) {
      return res.status(400).json({ success: false, message: 'Item type and ID are required' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const store = user.stores.id(storeId);
    
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    
    // Validate item exists based on type
    let item;
    if (itemType === 'product') {
      item = await Product.findById(itemId);
    } else if (itemType === 'service') {
      item = await Service.findById(itemId);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid item type' });
    }
    
    if (!item) {
      return res.status(404).json({ success: false, message: `${itemType} not found` });
    }
    
    // Check if item already exists in store
    const itemExists = store.items.find(
      i => i.itemType === itemType && i.itemId.toString() === itemId
    );
    
    if (itemExists) {
      return res.status(400).json({ success: false, message: 'Item already exists in store' });
    }
    
    // Create new store item
    const newItem = {
      itemType,
      itemId,
      ownerId: item.userId
    };
    
    // Set affiliate commission if provided, regardless of ownership
    if (affiliateCommission !== undefined && affiliateCommission !== null) {
      newItem.affiliateCommission = Number(affiliateCommission);
    } else if (item.userId.toString() !== user._id.toString()) {
      // Default to 0 for affiliate items if not provided
      newItem.affiliateCommission = 0;
    }
    
    // Set myearning based on the specified rules
    if (item.userId.toString() !== user._id.toString() && store.storeType === 'affiliate') {
      // If different users and store type is affiliate, myearning = affiliateCommission
      newItem.myearning = newItem.affiliateCommission;
    } else {
      // If same user adding to different store types, myearning = 100
      newItem.myearning = 100;
    }
    
    // Add item to store
    store.items.push(newItem);
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Item added to store successfully',
      item: newItem
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove item from store
// @route   DELETE /api/users/stores/:storeId/items/:itemId
// @access  Private
exports.removeItemFromStore = async (req, res) => {
  try {
    const { storeId, itemId } = req.params;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const store = user.stores.id(storeId);
    
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    
    // Find item index in store items array
    const itemIndex = store.items.findIndex(item => item._id.toString() === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in store' });
    }
    
    // Remove item from store using splice
    store.items.splice(itemIndex, 1);
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Item removed from store successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update item in store
// @route   PUT /api/users/stores/:storeId/items/:itemId
// @access  Private
exports.updateItemInStore = async (req, res) => {
  try {
    const { storeId, itemId } = req.params;
    const { affiliateCommission } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const store = user.stores.id(storeId);
    
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    
    // Find item in store
    const item = store.items.id(itemId);
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in store' });
    }
    
    // Update item fields
    if (affiliateCommission !== undefined && affiliateCommission !== null) {
      item.affiliateCommission = Number(affiliateCommission);
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Store item updated successfully',
      item
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};