const mongoose = require('mongoose');
const Place = require('../models/Place');

/**
 * GET /api/places/search?q=<query>
 * Text search on Place name, normalizedName, and description.
 */
const searchPlaces = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required and cannot be empty.',
      });
    }

    const campusId = req.query.campusId || null;
    const filter = {
      searchable: true,
      $text: { $search: q },
    };
    if (campusId) {
      if (!mongoose.Types.ObjectId.isValid(campusId)) {
        return res.status(400).json({ success: false, error: 'Invalid campusId format.' });
      }
      filter.campusId = new mongoose.Types.ObjectId(campusId);
    }

    const places = await Place.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .select('name normalizedName category subcategory description location geometry')
      .lean();

    return res.status(200).json({
      success: true,
      count: places.length,
      query: q,
      results: places.map(formatPlace),
    });
  } catch (err) {
    console.error('[placeController.searchPlaces]', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error during place search.' });
  }
};

/**
 * GET /api/places/:id
 * Get a single Place document by MongoDB ObjectId.
 */
const getPlaceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `"${id}" is not a valid Place ID.`,
      });
    }

    const place = await Place.findById(id)
      .select('name normalizedName category subcategory description location geometry searchable metadata')
      .lean();

    if (!place) {
      return res.status(404).json({
        success: false,
        error: `No place found with ID "${id}".`,
      });
    }

    return res.status(200).json({
      success: true,
      result: formatPlaceDetailed(place),
    });
  } catch (err) {
    console.error('[placeController.getPlaceById]', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error fetching place details.' });
  }
};

/**
 * GET /api/places/nearby?lat=&lng=&radius=&category=
 * Find Places near a coordinate using MongoDB 2dsphere $near.
 */
const getNearbyPlaces = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 500; // meters, default 500m
    const category = (req.query.category || '').trim().toLowerCase() || null;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Valid "lat" and "lng" query parameters are required.',
      });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates out of valid range. Latitude: -90 to 90, Longitude: -180 to 180.',
      });
    }
    if (radius <= 0 || radius > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Radius must be a positive number up to 50000 meters.',
      });
    }

    // GeoJSON stores [longitude, latitude]
    const filter = {
      searchable: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      },
    };
    if (category) filter.category = category;

    const places = await Place.find(filter)
      .select('name normalizedName category subcategory description location geometry')
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      count: places.length,
      queryPoint: { lat, lng },
      radiusMeters: radius,
      category: category || 'all',
      results: places.map(formatPlace),
    });
  } catch (err) {
    console.error('[placeController.getNearbyPlaces]', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error fetching nearby places.' });
  }
};

/**
 * GET /api/places
 * List all searchable places, optionally filtered by category.
 */
const listPlaces = async (req, res) => {
  try {
    const category = (req.query.category || '').trim().toLowerCase() || null;
    const filter = { searchable: true };
    if (category) filter.category = category;

    const places = await Place.find(filter)
      .select('name normalizedName category subcategory description location geometry')
      .sort({ category: 1, name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: places.length,
      results: places.map(formatPlace),
    });
  } catch (err) {
    console.error('[placeController.listPlaces]', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error listing places.' });
  }
};

// ─── Formatters ─────────────────────────────────────────────────────────────

const formatPlace = (p) => ({
  id: p._id,
  name: p.name,
  category: p.category,
  subcategory: p.subcategory || null,
  description: p.description || null,
  location: {
    type: 'Point',
    coordinates: p.location.coordinates, // [longitude, latitude]
    lat: p.location.coordinates[1],
    lng: p.location.coordinates[0],
  },
  hasGeometry: !!(p.geometry && p.geometry.coordinates),
});

const formatPlaceDetailed = (p) => ({
  id: p._id,
  name: p.name,
  category: p.category,
  subcategory: p.subcategory || null,
  description: p.description || null,
  location: {
    type: 'Point',
    coordinates: p.location.coordinates,
    lat: p.location.coordinates[1],
    lng: p.location.coordinates[0],
  },
  geometry: p.geometry || null,
  metadata: p.metadata
    ? {
        source: p.metadata.get ? p.metadata.get('source') : p.metadata.source,
        osmId: p.metadata.get ? p.metadata.get('osmId') : p.metadata.osmId,
        osmType: p.metadata.get ? p.metadata.get('osmType') : p.metadata.osmType,
      }
    : null,
});

module.exports = {
  searchPlaces,
  getPlaceById,
  getNearbyPlaces,
  listPlaces,
};
