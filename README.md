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

**First time — install dependencies:**

```bash
./setup.sh
```

Creates a Python virtualenv (`.venv`) and installs all Python and Node packages.

**Seed the database** (run once, or any time you want a clean slate):

```bash
./reset.sh
```

Clears `__pycache__`, wipes the SQLite database, and reseeds it with demo users and waypoint trees.

**Start the app:**

```bash
./run.sh
```

Then open `http://localhost:5173`.

Starts the Flask backend on port 8000 and the Vite dev server in parallel. Both are killed cleanly on Ctrl-C.

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
setup.sh    Install Python venv + Node deps
reset.sh    Clear __pycache__, wipe + reseed database
run.sh      Start Flask (port 8000) + Vite (port 5173) in parallel
run.py      Flask entry point (used by run.sh)
seed.py     Demo data — users and waypoint trees

backend/
  models/     SQLAlchemy ORM — User, Waypoint, JournalEntry
  db/         Query helpers (get, create, update)
  routes/     Flask blueprints — /api/user, /api/waypoint, /api/journal
  services/   Photon POI discovery
  app.py      App factory

frontend/src/
  api/        Typed HTTP clients (user.ts, waypoint.ts, journal.ts)
  components/
    Map/           Leaflet map — markers, polylines, pulsing, selection
    SidePanel/     Scrollable waypoint list (desktop + mobile drawer)
    WaypointPanel/ Bottom-sheet detail card with address, journal, visited action
    Header/        Theme toggle, user switcher, radius control, CategoryFilter
    Landing/       Login / sign-up screen with animated canvas background
    ErrorModal/    Full-screen error overlay
  lib/
    categoryColor.ts  Single source of truth for category → colour
  App.tsx     Root — orchestrates visit/explore/journal flow and all shared state
```

---

## API reference

### Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/user` | List all users |
| `GET` | `/api/user/<id>` | Fetch user by ID |
| `POST` | `/api/user` | Create user `{username, lat, lon}` |
| `PATCH` | `/api/user/<id>/root` | Assign root waypoint `{root_waypoint_id}` |
| `GET` | `/api/user/address-search?q=...` | Geocode an address via Nominatim |

### Waypoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/waypoint/<id>` | Fetch single waypoint |
| `GET` | `/api/waypoint/tree/<user_id>` | Fetch full nested tree for a user |
| `POST` | `/api/waypoint` | Create waypoint `{lat, lon, name, api_id?}` |
| `PATCH` | `/api/waypoint/<id>/visited` | Mark visited `{visited: bool}` |
| `PATCH` | `/api/waypoint/<id>/children` | Attach children `{child_ids: int[]}` |
| `POST` | `/api/waypoint/osm` | Discover nearby POIs `{lat, lon, num?, radius?}` |

### Journal

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/journal` | Save entry `{waypoint_id, user_id, content}` (idempotent) |
| `GET` | `/api/journal/<waypoint_id>/<user_id>` | Fetch entry; 404 if none |

---

## Team

- **Matt Mammano**
- **Nick Messina**
- **Nick Mirigliani**
- **Rishi Raj**
