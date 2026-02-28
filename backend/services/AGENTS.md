# backend/services/

External API integrations and dev tooling for BR@NCH.

---

## `osm.py` — OSM Location Lookup

Wraps the Overpass API to find named POIs near a coordinate.

**Function:**

```python
query_nearby(lat, lon, rad=500.0, limit=10) -> list[dict]
```

**Returns** a list of dicts, each with:

| Key | Type | Description |
| --- | ---- | ----------- |
| `id` | str | OSM reference, e.g. `"node/123456"` or `"way/789"` |
| `name` | str | Display name from OSM tags |
| `lat` | float | Latitude |
| `lon` | float | Longitude |

**POI filter:** only returns nodes/ways tagged with `amenity`, `shop`, `tourism`, `leisure`, or `historic` — excludes streets, transit stops, and unnamed features.

**Notes:**
- Uses the public Overpass API (`overpass-api.de`) — no auth required, but subject to rate limits.
- Timeout is 30 s per request; keep `rad` small (≤ 500 m) for dense areas to avoid large result sets.
- Results are capped at `limit` after filtering for a `name` tag.

---

## `seed.py` — Database Seed Script

Populates the database with test users and waypoints by calling the live Flask API. Requires the server to be running.

**Usage:**

```bash
python -m backend.services.seed
```

**Seeded users:**

| Username | Password | Tree |
| -------- | -------- | ---- |
| `alice` | `password123` | ~10 waypoints rooted in Hoboken, NJ |
| `bob` | `password123` | ~10 waypoints rooted in San Francisco |
| `carol` | `password123` | ~10 waypoints rooted in Chicago |
| `dave` | `password123` | Root-only (London) — no children |
| `eve` | `password123` | Placeholder root (Tokyo) — no meaningful tree |

**Tree structure:** BFS expansion — each node gets 1–3 children via `query_nearby(..., rad=300)`, stopping at 10 total waypoints. Duplicate OSM IDs are skipped across the tree.

**Notes:**
- `root_waypoint_id` is non-nullable in the current schema, so `eve` (the "no waypoints" user) still receives a placeholder root waypoint. A schema change would be needed to support a truly rootless user.
- The script exits with status `1` on any HTTP or runtime error and prints a descriptive message to stderr.
- Safe to re-run only against a fresh/empty database — usernames are unique and will conflict on a second run.
