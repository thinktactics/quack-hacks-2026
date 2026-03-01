# BR@NCH

> **A skill tree for real-life exploration.**

BR@NCH is an interactive map app that brings the skill tree mechanic into the real world. Start somewhere — your home, your favourite café, anywhere — and let the app branch outward, surfacing nearby places worth discovering. Mark them visited, and the tree keeps growing.

Built for **QuackHacks 2026** by Matt Mammano, Nick Messina, Nick Mirigliani, and Rishi Raj.

---

## How it works

Every user has a **root waypoint** — a starting location. When you visit it, BR@NCH queries Photon to discover nearby points of interest and attaches them as child nodes. Visit those, and new branches appear. The further you explore, the deeper the tree grows.

Each waypoint is colour-coded by category (museum, restaurant, park, shop, café, attraction), shown both on the live map and in the side panel. Unvisited nodes pulse gently until you click them.

---

## Running locally

```bash
./run.sh
```

Then open `http://localhost:5173`.

That single command activates the Python virtualenv, starts the Flask backend on port 8000, and spins up the Vite dev server — both in parallel, both killed cleanly on Ctrl-C.

**First run:** seed the database with example users and root waypoints:

```bash
python seed.py
```

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.10+, Flask 3.0, SQLAlchemy 2.0, SQLite / MySQL |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Leaflet |
| Map tiles | CartoDB (dark + light, label-free) |
| POI data | Photon |
| Geocoding | Nominatim (reverse geocode for address display) |

---

## Project structure

```
backend/
  models/     SQLAlchemy ORM — User, Waypoint
  db/         Query helpers (get, create, update)
  routes/     Flask blueprints — /api/user, /api/waypoint
  services/   OSM / Photon POI discovery
  app.py      App factory

frontend/src/
  api/        Typed HTTP clients (user.ts, waypoint.ts)
  components/
    Map/          Leaflet map — markers, polylines, pulsing, selection
    SidePanel/    Scrollable waypoint list (desktop)
    WaypointPanel/ Detail card with address + visited action
    Header/       Theme toggle, user switcher
  lib/
    categoryColor.ts  Single source of truth for category → colour
  App.tsx     Root — orchestrates visit/explore flow and all shared state
```

---

## API reference

### Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/user/<id>` | Fetch user |
| `POST` | `/api/user` | Create user `{username, lat, lon}` |
| `PATCH` | `/api/user/<id>/root` | Assign root waypoint `{root_waypoint_id}` |

### Waypoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/waypoint/<id>` | Fetch single waypoint |
| `GET` | `/api/waypoint/tree/<user_id>` | Fetch full nested tree |
| `POST` | `/api/waypoint` | Create waypoint `{lat, lon, name, api_id?}` |
| `PATCH` | `/api/waypoint/<id>/visited` | Mark visited `{visited: bool}` |
| `PATCH` | `/api/waypoint/<id>/children` | Attach children `{child_ids: int[]}` |
| `POST` | `/api/waypoint/osm` | Discover nearby POIs `{lat, lon, num?}` |

---

## Team

- **Matt Mammano**
- **Nick Messina**
- **Nick Mirigliani**
- **Rishi Raj**
