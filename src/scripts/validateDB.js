const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const Campus = require('../models/Campus');
const Place = require('../models/Place');

/**
 * Comprehensive DISHAA Database Foundation & Imported Data Validation
 */
async function runValidation() {
  console.log('==================================================');
  console.log('DISHAA DATABASE & IMPORTED DATA VALIDATION');
  console.log('==================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Check ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Check ${totalTests}: ${message}`);
    }
  }

  // 1. Model Loading Validation
  console.log('--- 1. Schema & Model Integrity ---');
  assert(typeof Campus === 'function', 'Campus model loaded');
  assert(typeof Place === 'function', 'Place model loaded');
  assert(Campus.schema.path('location') !== undefined, 'Campus location path defined');
  assert(Place.schema.path('location') !== undefined, 'Place location path defined');

  // 2. Offline Schema & GeoJSON Validation Test
  console.log('\n--- 2. Schema Rules & GeoJSON Coordinate Ordering ---');
  const testCampus = new Campus({
    name: 'Generic Test Campus',
    location: { type: 'Point', coordinates: [79.0025, 21.1245] },
  });
  assert(!testCampus.validateSync(), 'Campus validates GeoJSON Point [lon, lat]');

  const testPlace = new Place({
    campusId: new mongoose.Types.ObjectId(),
    name: 'Test Place',
    category: 'building',
    location: { type: 'Point', coordinates: [79.0028, 21.1252] },
  });
  assert(!testPlace.validateSync(), 'Place validates and auto-generates normalizedName');
  assert(testPlace.normalizedName === 'test place', 'normalizedName setter operates correctly');

  // 3. Database Connection & Imported Data Audit
  console.log('\n--- 3. Database Content Audit & Index Verification ---');
  await connectDB();
  await Campus.init();
  await Place.init();

  const campusCount = await Campus.countDocuments();
  const placeCount = await Place.countDocuments();

  assert(campusCount > 0, `Campus record exists (Count: ${campusCount})`);
  assert(placeCount === 32, `Exactly 32 Places imported (Count: ${placeCount})`);

  // Check 2dsphere index status
  const campusIndexes = await Campus.collection.indexes();
  const placeIndexes = await Place.collection.indexes();
  const hasCampus2d = campusIndexes.some((idx) => idx.key && idx.key.location === '2dsphere');
  const hasPlace2d = placeIndexes.some((idx) => idx.key && idx.key.location === '2dsphere');
  assert(hasCampus2d, 'Campus 2dsphere index active');
  assert(hasPlace2d, 'Place 2dsphere index active');

  // Audit Place documents for missing names, missing coordinates, or duplicates
  console.log('\n--- 4. Place Data Quality & Duplicate Audit ---');
  const places = await Place.find({});

  let missingNames = 0;
  let missingCoords = 0;
  let invalidCoords = 0;
  const osmIdMap = new Map();
  let duplicateOsmIds = 0;

  places.forEach((p) => {
    if (!p.name || p.name.trim() === '') missingNames++;
    if (!p.location || !p.location.coordinates) missingCoords++;
    else {
      const [lon, lat] = p.location.coordinates;
      if (
        typeof lon !== 'number' ||
        typeof lat !== 'number' ||
        lon < -180 ||
        lon > 180 ||
        lat < -90 ||
        lat > 90
      ) {
        invalidCoords++;
      }
    }

    if (p.metadata && p.metadata.get && p.metadata.get('osmId')) {
      const idKey = `${p.metadata.get('osmType')}/${p.metadata.get('osmId')}`;
      if (osmIdMap.has(idKey)) duplicateOsmIds++;
      else osmIdMap.set(idKey, true);
    }
  });

  assert(missingNames === 0, 'Zero missing place names');
  assert(missingCoords === 0, 'Zero missing place coordinates');
  assert(invalidCoords === 0, 'Zero invalid coordinate values');
  assert(duplicateOsmIds === 0, 'Zero duplicate Place records (Idempotence verified)');

  // Category Breakdown
  console.log('\n--- 5. Category Breakdown ---');
  const categories = await Place.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  categories.forEach((cat) => {
    console.log(`  - ${cat._id.padEnd(12)}: ${cat.count} places`);
  });

  // 6. Sample Geospatial & Text Queries
  console.log('\n--- 6. Sample Queries ---');

  // Sample Geospatial $near query (Near Block B / Canteen 1)
  const nearQueryResult = await Place.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [79.00245, 21.12416] },
        $maxDistance: 100, // 100 meters
      },
    },
  }).limit(3);

  assert(
    nearQueryResult.length > 0,
    `Geospatial $near query returned ${nearQueryResult.length} nearby places within 100m of [79.00245, 21.12416]`
  );
  console.log(`  Sample $near places: ${nearQueryResult.map((p) => `"${p.name}" (${p.category})`).join(', ')}`);

  // Sample Text Search query ("Canteen")
  const searchResult = await Place.find(
    { $text: { $search: 'Canteen' } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });

  assert(
    searchResult.length > 0,
    `Text search query for "Canteen" returned ${searchResult.length} matches`
  );
  console.log(`  Sample text search matches: ${searchResult.map((p) => `"${p.name}"`).join(', ')}`);

  await disconnectDB();

  console.log('\n==================================================');
  console.log(`FINAL RESULTS: ${passedTests} / ${totalTests} checks passed successfully.`);
  console.log('==================================================\n');
}

if (require.main === module) {
  runValidation().catch((err) => {
    console.error('[VALIDATION ERROR]', err);
    process.exit(1);
  });
}

module.exports = runValidation;
