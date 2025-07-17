const { uploadImage } = require('../../config/cloudinary');

// Middleware for handling category image uploads
exports.uploadCategoryImages = uploadImage.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

// Process uploaded files and add URLs to request body
exports.processUploadedFiles = (req, res, next) => {
  // If files were uploaded, add their URLs to the request body
  if (req.files) {
    // Process icon
    if (req.files.icon && req.files.icon[0]) {
      req.body.icon = req.files.icon[0].path;
    }
    
    // Process image
    if (req.files.image && req.files.image[0]) {
      req.body.image = req.files.image[0].path;
    }
  }
  
  next();
};