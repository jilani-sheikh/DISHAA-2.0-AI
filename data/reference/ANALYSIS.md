# DISHAA Phase 1 — Campus Data Analysis Report

## Executive Summary
This analysis evaluates `data/reference/campus.osm` and `data/reference/campus.geojson` to construct an authoritative inventory of the DISHAA campus dataset.

The dataset contains:
- **36 Semantic Campus Entities & Places** (for MongoDB `Place` and `Campus` collections)
- **25 Highway & Barrier Routing Network Features** (reserved strictly for Valhalla routing)

---

## 1. OSM Feature Count

| Element Type | Total Count | Tagged Count | Untagged Geometry Nodes |
| :--- | :--- | :--- | :--- |
| **Nodes** | 230 | 10 | 220 |
| **Ways** | 51 | 51 | 0 |
| **Relations** | 0 | 0 | 0 |
| **Total OSM Elements** | **281** | **61** | **220** |

---

## 2. GeoJSON Feature Count & Geometry Distribution

| Geometry Type | Count | Percentage |
| :--- | :--- | :--- |
| **Point** | 10 | 16.4% |
| **LineString** | 30 | 49.2% |
| **Polygon** | 21 | 34.4% |
| **MultiPolygon** | 0 | 0% |
| **Total Features** | **61** | **100.0%** |

---

## 3. Identifiable Campus Places & Proposed Categories (MongoDB Store)

The following 36 features represent semantic campus entities to be stored in MongoDB:

| Feature ID | Name / Label | Geometry | Source OSM Tags | Proposed Dishaa Category | Target Collection |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `way/848874321` | GHRCEM Boundary | LineString | `boundary=administrative, college=GHRCEM` | `campus_boundary` | `Campus.boundary` |
| `way/1304123444` | G H R C E M | Polygon | `landuse=education, name=G H R C E M` | `campus_boundary` | `Campus.boundary` |
| `way/1304037809` | Block A | Polygon | `building=office, name=Block A` | `building` / `academic` | `Place` |
| `way/1304038255` | Block B | Polygon | `building=college, name=Block B` | `building` / `academic` | `Place` |
| `way/1304039182` | Block C | Polygon | `building=college, name=Block C` | `building` / `academic` | `Place` |
| `way/1304254977` | Workshop | Polygon | `building=yes, name=Workshop, shop=trade` | `building` / `academic` | `Place` |
| `way/1331094800` | Training Centre | Polygon | `building=yes, name=Training Centre, shop=trade` | `building` / `academic` | `Place` |
| `way/1537929854` | (Unnamed Building Footprint) | Polygon | `building=yes` | `excluded_unnamed_footprint` | Excluded (Non-Place) |
| `way/1304254978` | Administrative & Security Office | Polygon | `building=yes, military=office` | `office` | `Place` |
| `way/1304093559` | Girls Hostel | Polygon | `building=yes, name=Girls Hostel, tourism=hostel` | `hostel` | `Place` |
| `way/1304093560` | Boys Hostel | Polygon | `building=yes, name=Boys Hostel, tourism=hostel` | `hostel` | `Place` |
| `node/12076551612` | Canteen 1 | Point | `amenity=restaurant, name=Canteen 1` | `food` | `Place` |
| `node/12077238611` | Sandwich Cafe | Point | `amenity=restaurant, name=Sandwich Cafe` | `food` | `Place` |
| `node/12077238612` | Siddhi Cafe | Point | `amenity=restaurant, name=Siddhi Cafe` | `food` | `Place` |
| `node/12077238613` | NesCafe | Point | `amenity=cafe, name=NesCafe` | `food` | `Place` |
| `node/12083790013` | Chaap Centre | Point | `amenity=restaurant, name=Chaap Centre` | `food` | `Place` |
| `node/12076973483` | Students Section | Point | `office=student, name=Students Section` | `office` | `Place` |
| `node/12077080298` | Account Section | Point | `office=accountant, name=Account Section` | `office` | `Place` |
| `way/1304831316` | G H R C E M Office | LineString | `name=G H R C E M, office=educational_institution` | `office` | `Place` |
| `way/1304123441` | Futsal | Polygon | `landuse=recreation_ground, name=Futsal` | `sports` | `Place` |
| `way/1304123442` | Basketball | Polygon | `landuse=recreation_ground, name=Basketball` | `sports` | `Place` |
| `way/1304123443` | Ground | Polygon | `landuse=recreation_ground, name=Ground` | `sports` | `Place` |
| `way/1314688114` | Handball | Polygon | `landuse=recreation_ground, name=Handball` | `sports` | `Place` |
| `way/1331094798` | Green GYM | Polygon | `leisure=garden, name=Green GYM` | `sports` | `Place` |
| `node/12077255035` | Horses | Point | `leisure=horse_riding, name=Horses` | `sports` / `facility` | `Place` |
| `way/1304705715` | Students Parking | Polygon | `amenity=motorcycle_parking, name=Students Parking` | `parking` | `Place` |
| `way/1304705716` | Staff Parking | Polygon | `amenity=motorcycle_parking, name=Staff Parking` | `parking` | `Place` |
| `way/1331094801` | Bus Area | LineString | `bus=yes, name=Bus Area, public_transport=platform` | `parking` / `facility` | `Place` |
| `node/12083790014` | Main Entrance Gate | Point | `barrier=gate` | `gate` | `Place` |
| `node/12076551613` | Xerox Center | Point | `shop=books, name=Xerox Center` | `facility` | `Place` |
| `way/1304127270` | Mata di Temple | Polygon | `amenity=place_of_worship, building=yes, religion=hindu` | `facility` | `Place` |
| `way/1304127271` | Sitting Area | Polygon | `leisure=park, name=Sitting Area` | `facility` | `Place` |
| `way/1304254969` | Lawn / Park | Polygon | `leisure=park` | `facility` | `Place` |
| `way/848874322` | Industrial Plot | Polygon | `landuse=industrial` | `excluded_industrial_edge` | Excluded (Non-Place) |
| `way/1304285835` | Outer Boundary Wall A | LineString | `barrier=city_wall` | `other` | `Place.metadata` |
| `way/1304285836` | Outer Boundary Wall B | LineString | `barrier=city_wall` | `other` | `Place.metadata` |

---

## 4. Routing-Only Features (Reserved for Valhalla)

The following 25 features are pure navigation infrastructure and must **NOT** be imported into MongoDB:

1. **Residential Roads (7)**:
   - `way/28464386` (`highway=residential`)
   - `way/372146302` (`highway=residential`)
   - `way/875096098` (`highway=residential`)
   - `way/875096099` (`highway=residential`)
   - `way/875096100` (`highway=residential`)
   - `way/875096104` (`highway=residential`)
   - `way/1304102148` (`highway=residential`)
2. **Service Roads (2)**:
   - `way/1227341953` (`highway=service, access=private`)
   - `way/1227341954` (`highway=service, access=private`)
3. **Footways, Paths & Sidewalks (13)**:
   - `way/875096107` (`highway=footway, access=private`)
   - `way/1304035596` (`highway=footway, footway=sidewalk`)
   - `way/1304035597` (`highway=footway, bicycle=no, horse=no`)
   - `way/1304094840` (`highway=footway, footway=sidewalk`)
   - `way/1304094841` (`highway=footway, footway=sidewalk`)
   - `way/1304127923` (`highway=path, informal=yes`)
   - `way/1304253541` (`highway=footway, footway=sidewalk`)
   - `way/1304706773` (`highway=footway, footway=sidewalk`)
   - `way/1316756807` (`highway=footway`)
   - `way/1316759307` (`highway=footway`)
   - `way/1316759308` (`highway=footway`)
   - `way/1316759309` (`highway=footway`)
   - `way/1331094799` (`highway=footway, footway=sidewalk`)
4. **Internal Wall Obstacles (3)**:
   - `way/1304127272` (`barrier=wall`)
   - `way/1304127273` (`barrier=wall`)
   - `way/1304254336` (`barrier=wall`)

---

## 5. OSM vs GeoJSON Differences & Discrepancies

1. **Way Feature Alignment**: All 51 OSM ways map 1-to-1 to the 51 LineString/Polygon features in GeoJSON.
2. **Duplicate Legacy Nodes in OSM**:
   - The OSM file contains 5 legacy node IDs (`312716398`, `12076551614`, `12076973488`, `12077238614`, `12077255036`) that represent older draft positions.
   - Node `312716398` in OSM places "Canteen 1" far north outside campus (`21.1277, 79.0055`), whereas `campus.geojson` correctly updates it to node `12076551612` inside Block B (`21.1241, 79.0024`).
   - `campus.geojson` is the sanitized, accurate export for POI location points.

---

## 6. Coordinate Validation Results

- **Total Coordinates Checked**: 346
- **Invalid / Out-of-bounds Coordinates**: 0
- **Bounding Box**:
  - Longitude Range: `[79.0004164, 79.0065719]`
  - Latitude Range: `[21.1230630, 21.1291104]`
- **Coordinate Order Verification**: All coordinates in `campus.geojson` follow standard `[longitude, latitude]`.

---

## 7. Potential Problems & Manual Review Checklist

1. **`way/1304254978` (`military=office`)**: Tagged as `military=office`. Needs manual verification during seed review (likely an administrative or security office).
2. **`way/848874322` (`landuse=industrial`)**: Polygon tagged as industrial landuse. Located on campus boundary.
3. **Unnamed Building (`way/1537929854`)**: Generic building footprint with `building=yes` but no `name` tag.
4. **Temple (`way/1304127270`)**: Has `amenity=place_of_worship, religion=hindu` but missing display name (should be set to "Mata di Temple").
5. **Main Entrance Gate (`node/12083790014`)**: Tagged as `barrier=gate` without name (should be named "Main Campus Gate").

---

## 8. Recommended Importer Filter Logic (`importGeoJSON.js`)

When building the importer script in the next phase, enforce the following classification rules:

```javascript
// Rule 1: Exclude Valhalla routing infrastructure
if (feature.properties.highway || feature.properties.footway || feature.properties.barrier === 'wall') {
  return; // Do NOT import into MongoDB
}

// Rule 2: Extract Campus Boundary
if (feature.properties.boundary === 'administrative' || feature.properties.landuse === 'education') {
  // Update Campus document boundary & location center
}

// Rule 3: Map POIs and Areas to Place schema categories
// Calculate center centroid for Polygon places to populate Place.location point
```
