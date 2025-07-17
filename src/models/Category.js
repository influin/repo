const mongoose = require('mongoose');
const { Schema } = mongoose;

const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true }, // For SEO URLs
  type: { type: String, enum: ['product', 'service', 'both'], default: 'both' },
  parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null }, // For nesting
  icon: { type: String }, // Optional: for UI
  image: { type: String }, // Optional: for UI banners
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Category', CategorySchema);