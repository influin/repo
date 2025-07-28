const Category = require('../models/Category');
const { cloudinary } = require('../../config/cloudinary');

// Helper function to create slug from name
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Helper function to extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  const splitUrl = url.split('/');
  const filename = splitUrl[splitUrl.length - 1];
  return `influencer-app/${filename.split('.')[0]}`;
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  try {
    const { name, type, parent, icon, image } = req.body;
    
    // Check if category with same name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists' });
    }
    
    // Create slug from name
    const slug = createSlug(name);
    
    // Create new category
    const category = await Category.create({
      name,
      slug,
      type: type || 'both',
      parent: parent || null,
      icon,
      image,
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Private/Admin
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate('parent', 'name slug');
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private/Admin
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('parent', 'name slug');
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  try {
    const { name, type, parent, icon, image, isActive } = req.body;
    
    let category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // If name is being updated, create new slug
    let updateData = {
      type,
      parent,
      isActive
    };
    
    if (name && name !== category.name) {
      // Check if new name already exists in another category
      const existingCategory = await Category.findOne({ name, _id: { $ne: req.params.id } });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
      
      updateData.name = name;
      updateData.slug = createSlug(name);
    }
    
    // Handle icon update
    if (icon && icon !== category.icon) {
      // Delete old icon if it exists
      if (category.icon) {
        const publicId = getPublicIdFromUrl(category.icon);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
      updateData.icon = icon;
    }
    
    // Handle image update
    if (image && image !== category.image) {
      // Delete old image if it exists
      if (category.image) {
        const publicId = getPublicIdFromUrl(category.image);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
      updateData.image = image;
    }
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
    
    category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('parent', 'name slug');
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if category has children
    const hasChildren = await Category.findOne({ parent: req.params.id });
    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories. Please delete or reassign subcategories first.'
      });
    }
    
    // Delete associated images from Cloudinary
    if (category.icon) {
      const iconPublicId = getPublicIdFromUrl(category.icon);
      if (iconPublicId) {
        await cloudinary.uploader.destroy(iconPublicId);
      }
    }
    
    if (category.image) {
      const imagePublicId = getPublicIdFromUrl(category.image);
      if (imagePublicId) {
        await cloudinary.uploader.destroy(imagePublicId);
      }
    }
    
    await category.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get category tree (hierarchical)
// @route   GET /api/categories/tree
// @access  Private/Admin
exports.getCategoryTree = async (req, res) => {
  try {
    // Get all categories
    const categories = await Category.find().populate('parent', 'name slug');
    
    // Create a map of categories by id
    const categoriesMap = {};
    categories.forEach(category => {
      categoriesMap[category._id] = {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        type: category.type,
        icon: category.icon,
        image: category.image,
        isActive: category.isActive,
        children: []
      };
    });
    
    // Create tree structure
    const tree = [];
    categories.forEach(category => {
      if (category.parent) {
        // Add to parent's children array
        categoriesMap[category.parent._id].children.push(categoriesMap[category._id]);
      } else {
        // Root level category
        tree.push(categoriesMap[category._id]);
      }
    });
    
    res.status(200).json({
      success: true,
      data: tree
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get parent categories only
// @route   GET /api/categories/parents
// @access  Public
exports.getParentCategories = async (req, res) => {
  try {
    // Get categories where parent is null (root level categories)
    const parentCategories = await Category.find({ 
      parent: null,
      isActive: true 
    }).select('name slug type icon image isActive createdAt');
    
    res.status(200).json({
      success: true,
      count: parentCategories.length,
      data: parentCategories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get categories by parent ID
// @route   GET /api/categories/parent/:parentId
// @access  Public
exports.getCategoriesByParent = async (req, res) => {
  try {
    const { parentId } = req.params;
    
    // Validate parent category exists if parentId is provided
    if (parentId !== 'null' && parentId !== 'root') {
      const parentCategory = await Category.findById(parentId);
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }
    
    // Build query based on parentId
    let query = { isActive: true };
    
    if (parentId === 'null' || parentId === 'root') {
      // Get root level categories (parent is null)
      query.parent = null;
    } else {
      // Get categories with specific parent ID
      query.parent = parentId;
    }
    
    const categories = await Category.find(query)
      .populate('parent', 'name slug')
      .select('name slug type icon image isActive createdAt parent')
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: categories.length,
      parentId: parentId === 'null' || parentId === 'root' ? null : parentId,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};