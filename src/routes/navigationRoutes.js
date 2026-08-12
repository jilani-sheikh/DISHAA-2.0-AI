const express = require('express');
const router = express.Router();
const {
  getDirectRoute,
  getRouteBetweenPlaces,
} = require('../controllers/navigationController');

// POST /api/navigation/route               – Coordinate-to-coordinate pedestrian route
router.post('/route', getDirectRoute);

// POST /api/navigation/route-between-places – Place name/ID-to-place route
router.post('/route-between-places', getRouteBetweenPlaces);

module.exports = router;
