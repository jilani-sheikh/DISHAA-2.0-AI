# DISHAA — Valhalla Routing Engine
# Phase 2A Operations Guide

## Architecture

```
campus.osm (READ-ONLY)
      │
      ▼
Docker: ghcr.io/gis-ops/docker-valhalla/valhalla:latest
      │  builds routing tiles from OSM data
      ▼
Valhalla HTTP API → localhost:8002
      │
      ▼
DISHAA Express API (src/services/valhallaService.js)
      │  getRoute(startLng, startLat, endLng, endLat)
      ▼
POST /api/navigation/route
POST /api/navigation/route-between-places
```

## Quick Start

```powershell
# Start Valhalla (first run builds tiles ~1-2 min, subsequent starts ~10s)
docker compose up -d

# Watch logs (wait for "Tile build complete" and "Listening on port 8002")
docker compose logs -f

# Check health
curl http://localhost:8002/status

# Stop Valhalla
docker compose down
```

## File Structure

| Path | Purpose |
|------|---------|
| `docker-compose.yml` | Valhalla container definition |
| `data/reference/campus.osm` | Source OSM data (READ-ONLY, never modified) |
| `data/valhalla/` | Generated tiles, config, admin DB (gitignored) |

## Pedestrian Routing

The DISHAA system uses Valhalla's `pedestrian` costing profile for all routing.

Example direct API call:

```bash
curl -X POST http://localhost:8002/route \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"lon": 79.0028290, "lat": 21.1254801},
      {"lon": 79.0024944, "lat": 21.1236546}
    ],
    "costing": "pedestrian",
    "directions_options": {
      "units": "kilometers",
      "language": "en-US"
    }
  }'
```

## Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `VALHALLA_URL` | `http://localhost:8002` | Set in `.env` |

## Troubleshooting

### Valhalla shows "unavailable" in /api/health
1. Check if container is running: `docker compose ps`
2. Check logs: `docker compose logs valhalla`
3. Tiles may still be building — wait for "Tile build complete"

### Routing returns error "No route found"
- The campus.osm routing network may have disconnected segments
- Pedestrian footways must connect between source and destination nodes
- Check that the OSM data has `highway=footway/path/residential` ways connecting the locations

### Force tile rebuild
```powershell
docker compose down
Remove-Item -Recurse "data\valhalla\*" -Force
docker compose up -d
```
