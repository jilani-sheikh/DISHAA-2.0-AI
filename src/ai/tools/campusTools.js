const mongoose = require('mongoose');
const Place = require('../../models/Place');
const { getRoute } = require('../../services/valhallaService');
const Campus = require('../../models/Campus');

const safeNumber = (value) => {
  const floatValue = Number(value);
  return Number.isFinite(floatValue) ? floatValue : null;
};

const resolvePlaceFromInput = async (input) => {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;

  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const byId = await Place.findById(trimmed).select('name category location description').lean();
    if (byId) return byId;
  }

  const byExactName = await Place.findOne({
    normalizedName: trimmed.toLowerCase(),
    searchable: true,
  }).select('name category location description').lean();
  if (byExactName) return byExactName;

  const byText = await Place.findOne(
    { $text: { $search: trimmed }, searchable: true },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .select('name category location description')
    .lean();

  return byText || null;
};

const searchCampusPlaces = async ({ query, limit = 5 }) => {
  const text = String(query || '').trim();
  if (!text) return [];

  const places = await Place.find(
    { searchable: true, $text: { $search: text } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .select('name category subcategory description location')
    .lean();

  return places.map((place) => ({
    id: place._id.toString(),
    name: place.name,
    category: place.category,
    subcategory: place.subcategory || null,
    description: place.description || null,
    location: {
      type: 'Point',
      coordinates: place.location.coordinates,
      lat: place.location.coordinates[1],
      lng: place.location.coordinates[0],
    },
  }));
};

const getCampusPlaceDetails = async ({ placeId }) => {
  if (!placeId) return null;

  const place = await Place.findById(placeId)
    .select('name category subcategory description location metadata')
    .lean();

  if (!place) return null;

  return {
    id: place._id.toString(),
    name: place.name,
    category: place.category,
    subcategory: place.subcategory || null,
    description: place.description || null,
    location: {
      type: 'Point',
      coordinates: place.location.coordinates,
      lat: place.location.coordinates[1],
      lng: place.location.coordinates[0],
    },
    metadata: place.metadata || null,
  };
};

const findNearbyPlaces = async ({ lat, lng, radius = 400, category = null, limit = 5 }) => {
  const parsedLat = safeNumber(lat);
  const parsedLng = safeNumber(lng);
  const parsedRadius = safeNumber(radius) || 400;

  if (parsedLat === null || parsedLng === null) return [];

  const filter = {
    searchable: true,
    location: { $near: { $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat] }, $maxDistance: parsedRadius } },
  };

  if (category) filter.category = category;

  const places = await Place.find(filter)
    .select('name category subcategory description location')
    .limit(limit)
    .lean();

  return places.map((place) => ({
    id: place._id.toString(),
    name: place.name,
    category: place.category,
    subcategory: place.subcategory || null,
    description: place.description || null,
    location: {
      type: 'Point',
      coordinates: place.location.coordinates,
      lat: place.location.coordinates[1],
      lng: place.location.coordinates[0],
    },
  }));
};

const getNavigationRoute = async ({ start, destination }) => {
  if (!start || !destination) return null;

  const startLat = safeNumber(start.lat);
  const startLng = safeNumber(start.lng);
  const destLat = safeNumber(destination.lat);
  const destLng = safeNumber(destination.lng);

  if (startLat === null || startLng === null || destLat === null || destLng === null) {
    return null;
  }

  const route = await getRoute(startLng, startLat, destLng, destLat);
  return {
    from: { lat: startLat, lng: startLng },
    to: { lat: destLat, lng: destLng },
    route,
  };
};

const isPointInsideCampus = async ({ lat, lng }) => {
  const parsedLat = safeNumber(lat);
  const parsedLng = safeNumber(lng);
  if (parsedLat === null || parsedLng === null) return false;

  // Construct GeoJSON point
  const point = { type: 'Point', coordinates: [parsedLng, parsedLat] };

  // Look for any Campus document whose boundary contains this point
  const campus = await Campus.findOne({ boundary: { $geoIntersects: { $geometry: point } } }).select('_id name').lean();
  return !!campus;
};

const buildContextSnapshot = ({ currentLocation, currentPlace, destination, navigationActive, route }) => ({
  currentLocation: currentLocation || null,
  currentPlace: currentPlace || null,
  destination: destination || null,
  navigationActive: Boolean(navigationActive),
  route: route || null,
});

module.exports = {
  searchCampusPlaces,
  getCampusPlaceDetails,
  findNearbyPlaces,
  getNavigationRoute,
  resolvePlaceFromInput,
  buildContextSnapshot,
  isPointInsideCampus,
};
