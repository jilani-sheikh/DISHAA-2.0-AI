# Reference Data Directory

This directory is reserved for raw campus mapping export files.

In the upcoming data-import phase, the following reference files will be added here:

1. `campus.osm` - OpenStreetMap raw XML data export for the campus.
2. `campus.geojson` - Exported GeoJSON feature collection for campus entities.

## Instructions
- Do not manually construct fake OSM or GeoJSON datasets in this directory.
- The `src/scripts/importGeoJSON.js` importer script will read from this directory once the official dataset files are placed here.
