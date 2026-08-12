const mongoose = require('mongoose');
const Place = require('../models/Place');
const { getRoute } = require('../services/valhallaService');

/**
 * Validate a coordinate pair and return a user-friendly error or null.
 */
const validateCoord = (lat, lng, label = 'Coordinate') => {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return `${label}: "lat" and "lng" must be valid numbers.`;
  }
  if (lat < -90 || lat > 90) return `${label}: latitude must be between -90 and 90.`;
  if (lng < -180 || lng > 180) return `${label}: longitude must be between -180 and 180.`;
  return null;
};

/**
 * POST /api/navigation/route
 * Direct coordinate-to-coordinate pedestrian route via Valhalla.
 *
 * Body:
 *   { "start": { "lat": ..., "lng": ... }, "destination": { "lat": ..., "lng": ... } }
 */
const getDirectRoute = async (req, res) => {
  try {
    const { start, destination } = req.body || {};

    if (!start || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Request body must include "start" and "destination" objects each with "lat" and "lng".',
      });
    }

    const startLat = parseFloat(start.lat);
    const startLng = parseFloat(start.lng);
    const destLat = parseFloat(destination.lat);
    const destLng = parseFloat(destination.lng);

    const errStart = validateCoord(startLat, startLng, 'start');
    if (errStart) return res.status(400).json({ success: false, error: errStart });

    const errDest = validateCoord(destLat, destLng, 'destination');
    if (errDest) return res.status(400).json({ success: false, error: errDest });

    const route = await getRoute(startLng, startLat, destLng, destLat);

    return res.status(200).json({
      success: true,
      from: { lat: startLat, lng: startLng },
      to: { lat: destLat, lng: destLng },
      route,
    });
  } catch (err) {
    console.error('[navigationController.getDirectRoute]', err.message);

    if (err.message.includes('unreachable') || err.message.includes('Valhalla')) {
      return res.status(503).json({
        success: false,
        error: 'Routing service is currently unavailable. Please try again later.',
        detail: err.message,
      });
    }
    return res.status(500).json({ success: false, error: 'Internal server error during route calculation.' });
  }
};

/**
 * POST /api/navigation/route-between-places
 * Route between two campus places identified by name or ID.
 *
 * Body:
 *   { "from": "Account Section", "to": "Girls Hostel" }
 *   OR
 *   { "from": "<mongoId>", "to": "<mongoId>" }
 */
const getRouteBetweenPlaces = async (req, res) => {
  try {
    const { from, to } = req.body || {};

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Request body must include "from" and "to" (place names or IDs).',
      });
    }

    const [fromPlace, toPlace] = await Promise.all([
      resolvePlaceFromInput(from),
      resolvePlaceFromInput(to),
    ]);

    if (!fromPlace) {
      return res.status(404).json({
        success: false,
        error: `Origin place not found: "${from}". Please verify the name or ID.`,
      });
    }
    if (!toPlace) {
      return res.status(404).json({
        success: false,
        error: `Destination place not found: "${to}". Please verify the name or ID.`,
      });
    }

    const [startLng, startLat] = fromPlace.location.coordinates;
    const [destLng, destLat] = toPlace.location.coordinates;

    const route = await getRoute(startLng, startLat, destLng, destLat);

    return res.status(200).json({
      success: true,
      from: {
        id: fromPlace._id,
        name: fromPlace.name,
        category: fromPlace.category,
        lat: startLat,
        lng: startLng,
      },
      to: {
        id: toPlace._id,
        name: toPlace.name,
        category: toPlace.category,
        lat: destLat,
        lng: destLng,
      },
      route,
    });
  } catch (err) {
    console.error('[navigationController.getRouteBetweenPlaces]', err.message);

    if (err.message.includes('unreachable') || err.message.includes('Valhalla')) {
      return res.status(503).json({
        success: false,
        error: 'Routing service is currently unavailable. Please try again later.',
        detail: err.message,
      });
    }
    return res.status(500).json({ success: false, error: 'Internal server error during place-to-place routing.' });
  }
};

/**
 * Resolve a Place document from a name string or MongoDB ObjectId string.
 * Returns the Place document or null if not found.
 */
const resolvePlaceFromInput = async (input) => {
  const trimmed = String(input).trim();

  // Try by MongoDB ObjectId first
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const byId = await Place.findById(trimmed).select('name category location').lean();
    if (byId) return byId;
  }

  // Try exact normalizedName match (case-insensitive)
  const byExactName = await Place.findOne({
    normalizedName: trimmed.toLowerCase(),
    searchable: true,
  }).select('name category location').lean();
  if (byExactName) return byExactName;

  // Fall back to text search for the closest match
  const byText = await Place.findOne(
    { $text: { $search: trimmed }, searchable: true },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .select('name category location')
    .lean();

  return byText || null;
};

module.exports = {
  getDirectRoute,
  getRouteBetweenPlaces,
};
