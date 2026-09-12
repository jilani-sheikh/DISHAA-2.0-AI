const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Place = require('../../models/Place');
const { getRoute } = require('../../services/valhallaService');
const Campus = require('../../models/Campus');

const safeNumber = (value) => {
  const floatValue = Number(value);
  return Number.isFinite(floatValue) ? floatValue : null;
};

// ─── Local Reference GeoJSON Fallback Cache (for offline resilience) ──────────
let localPlacesCache = null;

function calculateCentroid(coordinates, geometryType) {
  if (!coordinates) return [79.003, 21.124];
  if (geometryType === 'Point') {
    return [coordinates[0], coordinates[1]];
  }
  if (geometryType === 'LineString' && Array.isArray(coordinates)) {
    let sumLon = 0;
    let sumLat = 0;
    coordinates.forEach((c) => {
      sumLon += c[0];
      sumLat += c[1];
    });
    return [sumLon / coordinates.length, sumLat / coordinates.length];
  }
  if (geometryType === 'Polygon' && Array.isArray(coordinates) && coordinates[0]) {
    const ring = coordinates[0];
    let sumLon = 0;
    let sumLat = 0;
    ring.forEach((c) => {
      sumLon += c[0];
      sumLat += c[1];
    });
    return [sumLon / ring.length, sumLat / ring.length];
  }
  return [79.003, 21.124];
}

const getLocalPlaces = () => {
  if (localPlacesCache) return localPlacesCache;
  try {
    const geojsonPath = path.join(__dirname, '../../../data/reference/campus.geojson');
    if (fs.existsSync(geojsonPath)) {
      const parsed = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
      const features = Array.isArray(parsed?.features) ? parsed.features : [];
      localPlacesCache = features
        .filter((f) => f.properties && (f.properties.name || f.properties.amenity || f.properties.building))
        .map((f, index) => {
          const name = f.properties.name || f.properties.building || f.properties.amenity || `Campus Location ${index + 1}`;
          const category = f.properties.amenity ? 'Facility' : (f.properties.building ? 'Academic' : 'Campus Landmark');
          const coords = calculateCentroid(f.geometry?.coordinates, f.geometry?.type);
          return {
            id: String(f.id || f.properties.osm_id || index + 1),
            name,
            normalizedName: name.toLowerCase(),
            category,
            subcategory: f.properties.amenity || f.properties.shop || null,
            description: `${name} on campus.`,
            location: {
              type: 'Point',
              coordinates: coords,
              lat: coords[1],
              lng: coords[0],
            },
          };
        });
      return localPlacesCache;
    }
  } catch (_) {}
  localPlacesCache = [];
  return localPlacesCache;
};

const resolvePlaceFromInput = async (input) => {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;

  if (mongoose.connection.readyState === 1) {
    try {
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

      if (byText) return byText;
    } catch (_) {}
  }

  // Local GeoJSON fallback
  const local = getLocalPlaces();
  const lower = trimmed.toLowerCase();
  const found = local.find((p) => p.normalizedName.includes(lower) || lower.includes(p.normalizedName));
  return found || null;
};

const searchCampusPlaces = async ({ query, limit = 5 }) => {
  const text = String(query || '').trim();
  if (!text) return [];

  if (mongoose.connection.readyState === 1) {
    let places = [];
    try {
      places = await Place.find(
        { searchable: true, $text: { $search: text } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .select('name category subcategory description location')
        .lean();
    } catch (_) {}

    if (!places || places.length === 0) {
      try {
        const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        places = await Place.find({
          searchable: true,
          $or: [
            { name: { $regex: escaped, $options: 'i' } },
            { normalizedName: { $regex: escaped.toLowerCase(), $options: 'i' } },
            { category: { $regex: escaped, $options: 'i' } },
            { subcategory: { $regex: escaped, $options: 'i' } },
          ],
        })
          .limit(limit)
          .select('name category subcategory description location')
          .lean();
      } catch (_) {}
    }

    if (places && places.length > 0) {
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
    }
  }

  // Local GeoJSON fallback (instant & offline resilient)
  const local = getLocalPlaces();
  const lower = text.toLowerCase();
  const matched = local.filter((p) =>
    p.normalizedName.includes(lower) ||
    lower.includes(p.normalizedName) ||
    (p.subcategory && p.subcategory.toLowerCase().includes(lower))
  );

  return matched.slice(0, limit);
};

const getCampusPlaceDetails = async ({ placeId }) => {
  if (!placeId) return null;

  if (mongoose.connection.readyState === 1) {
    try {
      const place = await Place.findById(placeId)
        .select('name category subcategory description location metadata')
        .lean();

      if (place) {
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
      }
    } catch (_) {}
  }

  const local = getLocalPlaces();
  const found = local.find((p) => p.id === String(placeId));
  return found || null;
};

const findNearbyPlaces = async ({ lat, lng, radius = 400, category = null, limit = 5 }) => {
  const parsedLat = safeNumber(lat);
  const parsedLng = safeNumber(lng);
  const parsedRadius = safeNumber(radius) || 400;

  if (parsedLat === null || parsedLng === null) return [];

  if (mongoose.connection.readyState === 1) {
    try {
      const filter = {
        searchable: true,
        location: { $near: { $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat] }, $maxDistance: parsedRadius } },
      };

      if (category) filter.category = category;

      const places = await Place.find(filter)
        .select('name category subcategory description location')
        .limit(limit)
        .lean();

      if (places && places.length > 0) {
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
      }
    } catch (_) {}
  }

  // Local Haversine approximation
  const local = getLocalPlaces();
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000; // meters

  const withDistances = local.map((p) => {
    const dLat = toRad(p.location.lat - parsedLat);
    const dLng = toRad(p.location.lng - parsedLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(parsedLat)) * Math.cos(toRad(p.location.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return { ...p, distanceMeters: Math.round(dist) };
  });

  withDistances.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return withDistances.slice(0, limit);
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

  const route = await getRoute(startLng, startLat, destLng, destLat).catch(() => null);
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

  if (mongoose.connection.readyState === 1) {
    try {
      const point = { type: 'Point', coordinates: [parsedLng, parsedLat] };
      const campus = await Campus.findOne({ boundary: { $geoIntersects: { $geometry: point } } }).select('_id name').lean();
      if (campus) return true;
    } catch (_) {}
  }

  // Campus bounding envelope check
  return parsedLat >= 21.0 && parsedLat <= 21.3 && parsedLng >= 78.9 && parsedLng <= 79.2;
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
