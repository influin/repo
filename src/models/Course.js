const mongoose = require('mongoose');
const { Schema } = mongoose;

const CurriculumItemSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  duration: String, // e.g., "2 hours"
  order: { type: Number, required: true }
});

const CourseSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subjects: [String],
  basePrice: { type: Number, required: true },
  thumbnail: String,
  brochureFile: String, // URL to the uploaded brochure file
  curriculum: [CurriculumItemSchema],
  totalDuration: String, // e.g., "8 weeks"
  skillLevel: { 
    type: String, 
    enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
    default: 'All Levels'
  },
  prerequisites: [String],
  learningOutcomes: [String],
  providesCompletionCertificate: { type: Boolean, default: false },
  providesInternship: { type: Boolean, default: false },
  internshipDetails: {
    company: String,
    duration: String,
    isPaid: Boolean,
    description: String
  },
  isActive: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  totalEnrollments: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Course', CourseSchema);