const express = require('express');
const router = express.Router();
const {
  searchPlaces,
  getPlaceById,
  getNearbyPlaces,
  listPlaces,
} = require('../controllers/placeController');

// GET /api/places                  – List all searchable places (optional ?category=)
router.get('/', listPlaces);

// GET /api/places/nearby           – Find places near coordinates
// IMPORTANT: must be declared before /:id to avoid "nearby" being treated as an ID
router.get('/nearby', getNearbyPlaces);

// GET /api/places/search?q=<query> – Text search
router.get('/search', searchPlaces);

// GET /api/places/:id              – Get a single place by MongoDB ObjectId
router.get('/:id', getPlaceById);

module.exports = router;
