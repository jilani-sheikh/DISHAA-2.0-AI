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
 * GeoJSON Polygon / MultiPolygon Schema
 */
const BoundarySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon'],
      required: [true, 'Boundary geometry type must be Polygon or MultiPolygon'],
    },
    coordinates: {
      type: Array,
      required: [true, 'Boundary geometry coordinates array is required'],
    },
  },
  { _id: false }
);

const CampusSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campus name is required'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      postalCode: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: '' },
    },
    location: {
      type: PointSchema,
      required: [true, 'Campus location point is required'],
    },
    boundary: {
      type: BoundarySchema,
      required: false,
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

// Geospatial Indexes
CampusSchema.index({ location: '2dsphere' });
CampusSchema.index({ boundary: '2dsphere' }, { sparse: true });

const Campus = mongoose.models.Campus || mongoose.model('Campus', CampusSchema);

module.exports = Campus;
