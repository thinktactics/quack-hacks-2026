# backend/services/

External API integrations for BR@NCH.

---

## `osm.py` — POI Discovery via Photon

Wraps the [Photon API](https://photon.komoot.io) (by Komoot) to find named points of interest near a coordinate. Photon is an open-source geocoder backed by OpenStreetMap data — no API key required.

**Main function:**

```python
query_nearby(lat, lon, limit=10, radius=500) -> list[dict]
```

**Returns** up to `limit` dicts randomly sampled from all POIs found within `radius` meters:

| Key | Type | Description |
|-----|------|-------------|
| `id` | str | `"<osm_type>/<osm_id>"` e.g. `"node/123456"` |
| `name` | str | Display name from OSM |
| `lat` | float | Latitude |
| `lon` | float | Longitude |
| `category` | str | One of the 10 POI categories (see below) |

**POI categories queried** (one Photon request per category per radius pass):

`restaurant`, `park`, `museum`, `cafe`, `shop`, `attraction`, `natural`, `tourism`, `historic`, `leisure`

Each category fetches up to 5 candidates (`PER_CATEGORY_LIMIT`). Results are deduplicated by OSM ID and filtered to the requested radius using the Haversine formula.

**Radius expansion:** if fewer than `limit` results are found at the initial radius, the radius doubles (up to a 32 km hard cap) and the search retries automatically.

**Retry logic:** each Photon request is retried up to 7 times with exponential backoff (2–30 s) using `tenacity`. Only server errors (5xx) and network failures trigger retries; 4xx responses fail immediately.

**Sampling:** final results are randomly sampled (not sorted by distance) to encourage variety across repeated calls to the same location.

---

## Adding a new service

Drop a new `.py` module here and import it from `backend/routes/` as needed. Keep external HTTP calls in `services/`; DB logic belongs in `backend/db/`.
