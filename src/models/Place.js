const mongoose = require('mongoose');

/**
 * GeoJSON Point Schema
 * Coordinates convention: [longitude, latitude]
 */
const PointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: [true, 'GeoJSON point type must be "Point"'],
    },
    coordinates: {
      type: [Number],
      required: [true, 'GeoJSON point coordinates are required [longitude, latitude]'],
      validate: {
        validator: function (val) {
          if (!Array.isArray(val) || val.length !== 2) return false;
          const [lng, lat] = val;
          return (
            typeof lng === 'number' &&
            typeof lat === 'number' &&
            !isNaN(lng) &&
            !isNaN(lat) &&
            lng >= -180 &&
            lng <= 180 &&
            lat >= -90 &&
            lat <= 90
          );
        },
        message: 'Coordinates must be valid [longitude, latitude] pair (-180 <= lon <= 180, -90 <= lat <= 90)',
      },
    },
  },
  { _id: false }
);

/**
 * GeoJSON Polygon / MultiPolygon Geometry Schema (Optional area bound)
 */
const GeometrySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon'],
      required: [true, 'Geometry type must be Polygon or MultiPolygon'],
    },
    coordinates: {
      type: Array,
      required: [true, 'Geometry coordinates array is required'],
    },
  },
  { _id: false }
);

/**
 * Allowed Primary Categories for Campus Places
 */
const ALLOWED_CATEGORIES = [
  'building',
  'hostel',
  'food',
  'parking',
  'sports',
  'gate',
  'office',
  'facility',
  'academic',
  'other',
];

const PlaceSchema = new mongoose.Schema(
  {
    campusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: [true, 'Campus reference (campusId) is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Place name is required'],
      trim: true,
      set: function (v) {
        if (typeof v === 'string') {
          this.normalizedName = v.toLowerCase().trim();
        }
        return v;
      },
    },
    normalizedName: {
      type: String,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      lowercase: true,
      trim: true,
      enum: {
        values: ALLOWED_CATEGORIES,
        message: '{VALUE} is not a supported place category',
      },
    },
    subcategory: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: PointSchema,
      required: [true, 'Place location point is required'],
    },
    geometry: {
      type: GeometrySchema,
      required: false,
    },
    searchable: {
      type: Boolean,
      default: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to populate normalizedName if missing or name changed
PlaceSchema.pre('validate', function () {
  if (this.name) {
    this.normalizedName = this.name.toLowerCase().trim();
  }
});

// Indexes
PlaceSchema.index({ location: '2dsphere' });
PlaceSchema.index({ geometry: '2dsphere' }, { sparse: true });
PlaceSchema.index({ campusId: 1, category: 1 });
PlaceSchema.index({ campusId: 1, normalizedName: 1 });
PlaceSchema.index(
  { name: 'text', normalizedName: 'text', description: 'text' },
  { weights: { name: 10, normalizedName: 5, description: 1 } }
);

const Place = mongoose.models.Place || mongoose.model('Place', PlaceSchema);

module.exports = Place;
