const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../config/db');
const Campus = require('../models/Campus');
const Place = require('../models/Place');

/**
 * Centroid calculation helper for Point, LineString, and Polygon geometries.
 * Returns standard GeoJSON coordinate pair [longitude, latitude].
 */
function calculateCentroid(coordinates, geometryType) {
  if (geometryType === 'Point') {
    return [coordinates[0], coordinates[1]];
  }

  if (geometryType === 'LineString') {
    let sumLon = 0;
    let sumLat = 0;
    coordinates.forEach((coord) => {
      sumLon += coord[0];
      sumLat += coord[1];
    });
    return [
      parseFloat((sumLon / coordinates.length).toFixed(7)),
      parseFloat((sumLat / coordinates.length).toFixed(7)),
    ];
  }

  if (geometryType === 'Polygon') {
    const ring = coordinates[0];
    let sumLon = 0;
    let sumLat = 0;
    // Skip duplicate closing point if ring[0] === ring[last]
    const isClosed =
      ring.length > 1 &&
      ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1];
    const count = isClosed ? ring.length - 1 : ring.length;

    for (let i = 0; i < count; i++) {
      sumLon += ring[i][0];
      sumLat += ring[i][1];
    }
    return [
      parseFloat((sumLon / count).toFixed(7)),
      parseFloat((sumLat / count).toFixed(7)),
    ];
  }

  return null;
}

/**
 * Main DISHAA Campus GeoJSON Import Routine
 */
async function importGeoJSON() {
  console.log('==================================================');
  console.log('DISHAA CAMPUS GEOJSON DATA IMPORT');
  console.log('==================================================\n');

  const geojsonPath = path.join(__dirname, '../../data/reference/campus.geojson');
  if (!fs.existsSync(geojsonPath)) {
    console.error(`[ERROR] GeoJSON file not found at: ${geojsonPath}`);
    process.exit(1);
  }

  const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  console.log(`[INFO] Loaded GeoJSON file containing ${geojsonData.features.length} features.`);

  // Connect to MongoDB
  await connectDB();
  await Campus.init();
  await Place.init();

  // Summary counter
  const importSummary = {
    campusRecords: 0,
    placesTotal: 0,
    categories: {
      building: 0,
      hostel: 0,
      food: 0,
      offices: 0,
      sports: 0,
      parking: 0,
      gates: 0,
      facilities: 0,
      academic: 0,
      other: 0,
    },
    excluded: {
      routingInfrastructure: 0,
      industrialEdgePlot: 0,
      unnamedFootprint: 0,
    },
  };

  // 1. Process Campus Document
  console.log('\n--- 1. Processing Campus Document ---');
  
  // Find boundary feature (way/848874321)
  const boundaryFeature = geojsonData.features.find(
    (f) => f.id === 'way/848874321' || (f.properties && f.properties.boundary === 'administrative')
  );

  let boundaryGeometry = null;
  let campusLocation = [79.003112, 21.124578]; // Default centroid fallback

  if (boundaryFeature && boundaryFeature.geometry) {
    const coords = boundaryFeature.geometry.coordinates;
    if (boundaryFeature.geometry.type === 'Polygon') {
      boundaryGeometry = boundaryFeature.geometry;
    } else if (boundaryFeature.geometry.type === 'LineString') {
      // Ensure outer ring is closed for Polygon
      const ring = [...coords];
      if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
        ring.push([...ring[0]]);
      }
      boundaryGeometry = {
        type: 'Polygon',
        coordinates: [ring],
      };
    }
    campusLocation = calculateCentroid(coords, boundaryFeature.geometry.type);
  }

  const campusData = {
    name: 'G H Raisoni College of Engineering and Management',
    code: 'GHRCEM',
    description: 'GHRCEM Virtual Campus - Shraddha Park Campus, Nagpur',
    address: {
      street: 'Shraddha Park, Hingna Road',
      city: 'Nagpur',
      state: 'Maharashtra',
      postalCode: '440016',
      country: 'India',
    },
    location: {
      type: 'Point',
      coordinates: campusLocation,
    },
    boundary: boundaryGeometry,
    metadata: {
      source: 'openstreetmap',
      importedAt: new Date(),
    },
  };

  const campusDoc = await Campus.findOneAndUpdate({ code: 'GHRCEM' }, campusData, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  importSummary.campusRecords = 1;
  console.log(`[CAMPUS] Created/Updated Campus: "${campusDoc.name}" (_id: ${campusDoc._id})`);

  // 2. Process Places
  console.log('\n--- 2. Processing & Categorizing Places ---');

  const placesToUpsert = [];

  for (const feature of geojsonData.features) {
    const props = feature.properties || {};
    const g = feature.geometry;
    const osmId = props.osm_id || feature.id;
    const osmType = props.osm_type || (feature.id ? feature.id.split('/')[0] : 'way');

    // Rule A: Exclude Routing Infrastructure
    if (
      props.highway ||
      props.footway ||
      props.barrier === 'wall' ||
      (props.access === 'private' && props.highway)
    ) {
      importSummary.excluded.routingInfrastructure++;
      continue;
    }

    // Rule B: Exclude manual review items (industrial edge landuse & unnamed footprints)
    if (feature.id === 'way/848874322' || props.landuse === 'industrial') {
      importSummary.excluded.industrialEdgePlot++;
      console.log(`[EXCLUDED] ${feature.id}: Industrial boundary plot excluded from searchable Place data.`);
      continue;
    }

    if (
      feature.id === 'way/1537929854' ||
      (!props.name &&
        props.building === 'yes' &&
        feature.id !== 'way/1304127270' &&
        feature.id !== 'way/1304254978')
    ) {
      importSummary.excluded.unnamedFootprint++;
      console.log(`[EXCLUDED] ${feature.id}: Unnamed building footprint excluded from searchable Place data.`);
      continue;
    }

    // Rule C: Skip campus boundary features from Place collection (handled in Campus model)
    if (
      feature.id === 'way/848874321' ||
      props.boundary === 'administrative' ||
      props.landuse === 'education'
    ) {
      continue;
    }

    // Determine Place Name, Category, and Subcategory with Normalization Rules
    let name = props.name;
    let category = 'other';
    let subcategory = props.amenity || props.building || props.office || props.leisure || props.shop || '';

    // Normalization Rule 1: military=office -> category="office"
    if (feature.id === 'way/1304254978' || (props.building && props.military === 'office')) {
      name = 'Administrative & Security Office';
      category = 'office';
      subcategory = 'office_building';
    }
    // Normalization Rule 4: Temple -> "Mata di Temple", category="facility", subcategory="temple"
    else if (feature.id === 'way/1304127270' || props.amenity === 'place_of_worship') {
      name = 'Mata di Temple';
      category = 'facility';
      subcategory = 'temple';
    }
    // Normalization Rule 5: Unnamed Gate -> "Main Entrance Gate", category="gate", subcategory="main_gate"
    else if (feature.id === 'node/12083790014' || props.barrier === 'gate') {
      name = 'Main Entrance Gate';
      category = 'gate';
      subcategory = 'main_gate';
    }
    // Boundary Walls
    else if (feature.id === 'way/1304285835') {
      name = 'Outer Boundary Wall A';
      category = 'other';
      subcategory = 'boundary_wall';
    } else if (feature.id === 'way/1304285836') {
      name = 'Outer Boundary Wall B';
      category = 'other';
      subcategory = 'boundary_wall';
    }
    // Standard Place Categories
    else if (props.building === 'college' || props.building === 'office' || props.shop === 'trade') {
      category = 'academic';
      if (name && name.includes('Block')) subcategory = 'academic_block';
    } else if (props.tourism === 'hostel' || (name && name.toLowerCase().includes('hostel'))) {
      category = 'hostel';
      subcategory = name.toLowerCase().includes('girls') ? 'girls_hostel' : 'boys_hostel';
    } else if (props.amenity === 'restaurant' || props.amenity === 'cafe') {
      category = 'food';
    } else if (props.office) {
      category = 'office';
    } else if (
      props.landuse === 'recreation_ground' ||
      props.leisure === 'garden' ||
      props.leisure === 'horse_riding'
    ) {
      category = 'sports';
    } else if (props.amenity === 'motorcycle_parking' || props.public_transport === 'platform') {
      category = 'parking';
    } else if (props.shop || props.leisure === 'park') {
      category = 'facility';
    }

    if (!name || name.trim() === '') {
      name = `${category.charAt(0).toUpperCase() + category.slice(1)} Feature (${osmId})`;
    }

    const locationPoint = calculateCentroid(g.coordinates, g.type);

    let geometryObj = undefined;
    if (g.type === 'Polygon' || g.type === 'MultiPolygon') {
      geometryObj = g;
    }

    const placeDoc = {
      campusId: campusDoc._id,
      name,
      normalizedName: name ? name.toLowerCase().trim() : '',
      category,
      subcategory,
      description: `Campus ${category} location: ${name}`,
      location: {
        type: 'Point',
        coordinates: locationPoint,
      },
      geometry: geometryObj,
      searchable: true,
      metadata: {
        source: 'openstreetmap',
        osmId: String(osmId),
        osmType: String(osmType),
        originalTags: props,
      },
    };

    placesToUpsert.push(placeDoc);
  }

  // Perform Idempotent Upsert for each Place
  for (const pDoc of placesToUpsert) {
    const updated = await Place.findOneAndUpdate(
      {
        campusId: campusDoc._id,
        'metadata.osmId': pDoc.metadata.osmId,
        'metadata.osmType': pDoc.metadata.osmType,
      },
      pDoc,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    importSummary.placesTotal++;
    if (importSummary.categories[updated.category] !== undefined) {
      importSummary.categories[updated.category]++;
    } else {
      importSummary.categories[updated.category] = 1;
    }
  }

  console.log('\n==================================================');
  console.log('IMPORT PREVIEW & SUMMARY');
  console.log('==================================================');
  console.log(`Campus Records Created/Updated: ${importSummary.campusRecords}`);
  console.log(`Total Places Imported:           ${importSummary.placesTotal}`);
  console.log('\nBreakdown by Category:');
  Object.entries(importSummary.categories).forEach(([cat, count]) => {
    console.log(`  - ${cat.padEnd(14)}: ${count}`);
  });
  console.log('\nExcluded Features:');
  console.log(`  - Routing Network Features (Valhalla): ${importSummary.excluded.routingInfrastructure}`);
  console.log(`  - Industrial Edge Boundary Plot:        ${importSummary.excluded.industrialEdgePlot}`);
  console.log(`  - Unnamed Building Footprints:          ${importSummary.excluded.unnamedFootprint}`);
  console.log('==================================================\n');

  await disconnectDB();
}

if (require.main === module) {
  importGeoJSON().catch((err) => {
    console.error('[IMPORT ERROR]', err);
    process.exit(1);
  });
}

module.exports = importGeoJSON;
