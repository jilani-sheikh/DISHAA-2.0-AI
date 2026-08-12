const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const VALHALLA_URL = process.env.VALHALLA_URL || 'http://localhost:8002';

/**
 * Checks if the Valhalla routing engine is reachable.
 * Returns { available: true/false, message: string }
 */
const checkValhallaHealth = async () => {
  try {
    const res = await fetch(`${VALHALLA_URL}/status`, { timeout: 3000 });
    if (res.ok) {
      return { available: true, message: 'Valhalla is reachable' };
    }
    return { available: false, message: `Valhalla responded with HTTP ${res.status}` };
  } catch (err) {
    return { available: false, message: `Valhalla unreachable: ${err.message}` };
  }
};

/**
 * Requests a pedestrian route from Valhalla between two coordinate pairs.
 *
 * @param {number} startLng  - Start longitude
 * @param {number} startLat  - Start latitude
 * @param {number} endLng    - End longitude
 * @param {number} endLat    - End latitude
 * @returns {Object} Clean routing result
 */
const getRoute = async (startLng, startLat, endLng, endLat) => {
  const body = {
    locations: [
      { lon: startLng, lat: startLat },
      { lon: endLng, lat: endLat },
    ],
    costing: 'pedestrian',
    directions_options: {
      units: 'kilometers',
      language: 'en-US',
    },
  };

  let res;
  try {
    res = await fetch(`${VALHALLA_URL}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeout: 10000,
    });
  } catch (err) {
    throw new Error(`Valhalla is unreachable: ${err.message}`);
  }

  if (!res.ok) {
    let errBody = '';
    try {
      errBody = await res.text();
    } catch (_) {}
    throw new Error(`Valhalla routing error (HTTP ${res.status}): ${errBody}`);
  }

  const data = await res.json();

  // Parse the Valhalla response into a clean frontend-friendly result
  const trip = data.trip;
  if (!trip) {
    throw new Error('Valhalla returned an unexpected response format (no trip object).');
  }

  const summary = trip.summary;
  const legs = trip.legs || [];

  // Collect turn-by-turn maneuvers
  const instructions = [];
  legs.forEach((leg) => {
    (leg.maneuvers || []).forEach((m) => {
      instructions.push({
        instruction: m.instruction || '',
        street: m.street_names ? m.street_names.join(', ') : '',
        distanceKm: parseFloat((m.length || 0).toFixed(3)),
        durationSec: Math.round(m.time || 0),
      });
    });
  });

  // Encoded polyline shape for the whole trip
  const shape = trip.legs.length > 0 ? trip.legs[0].shape : null;

  return {
    distanceKm: parseFloat((summary.length || 0).toFixed(3)),
    durationSec: Math.round(summary.time || 0),
    durationMin: parseFloat(((summary.time || 0) / 60).toFixed(1)),
    encodedShape: shape,
    instructions,
  };
};

module.exports = {
  checkValhallaHealth,
  getRoute,
};
