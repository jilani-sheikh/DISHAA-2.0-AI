const mongoose = require('mongoose');

/**
 * Sitting Location Sub-Schema
 */
const SittingLocationSchema = new mongoose.Schema(
  {
    block: {
      type: String,
      required: [true, 'Block is required (e.g. BLOCK A, BLOCK B, BLOCK C)'],
      trim: true,
    },
    floor: {
      type: Number,
      required: [true, 'Floor number is required'],
      min: 0,
      max: 10,
    },
    roomNo: {
      type: String,
      required: [true, 'Room number is required (e.g. A-204, B-108)'],
      trim: true,
    },
  },
  { _id: false }
);

/**
 * Faculty Schema
 * Matches reference schema used for campus indoor navigation & directory
 */
const FacultySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Faculty name is required'],
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
      default: 'Faculty Member',
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['faculty', 'admin'],
      default: 'faculty',
    },
    sittingLocation: {
      type: SittingLocationSchema,
      required: [true, 'Sitting location is required'],
    },
  },
  {
    collection: 'faculties',
    timestamps: true,
  }
);

FacultySchema.index({ 'sittingLocation.block': 1, 'sittingLocation.floor': 1 });
FacultySchema.index({ 'sittingLocation.roomNo': 1 });
FacultySchema.index({ department: 1 });
FacultySchema.index({ name: 'text', department: 'text' });

const Faculty = mongoose.models.Faculty || mongoose.model('Faculty', FacultySchema);

module.exports = Faculty;
