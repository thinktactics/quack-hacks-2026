# BR@NCH

Skill tree app: explore local areas via *Waypoints* (location nodes).

## Tech Stack

- **Backend:** Python 3.10+, Flask 3.0, SQLAlchemy 2.0, MySQL
- **Frontend:** Node.js, npm, Vite, React, TypeScript
- **Dev Tools:** Black, isort, mypy, pytest

## Data Models

### User

| Field | Type | Notes |
| ----- | ---- | ----- |
| id | int | Primary key |
| username | str | Unique, indexed |
| lat | float | User location latitude, indexed |
| lon | float | User location longitude, indexed |
| root_waypoint_id | int | FK → Waypoint |

### Waypoint

| Field | Type | Notes |
| ----- | ---- | ----- |
| id | int | Primary key |
| api_id | str | OSM reference (optional) |
| lat | float | Indexed |
| lon | float | Indexed |
| name | str | Display name |
| children | list[int] | Child waypoint IDs (JSON) |
| visited | bool | Whether the waypoint has been visited (default: false) |

## API Endpoints

### User Routes

- `GET /api/user/<id>` — Fetch user by ID, returns `{id, username, lat, lon, root_waypoint_id}`
- `POST /api/user` — Create user with `{username, lat, lon, root_waypoint_id}` (all required)

### Waypoint Routes

- `GET /api/waypoint/<id>` — Fetch waypoint by ID, returns flat waypoint with child IDs
- `GET /api/waypoint/tree/<user_id>` — Fetch nested waypoint tree for user (recursive children)
- `PATCH /api/waypoint/<id>/visited` — Mark waypoint as visited
  - Body: `{visited: bool}` (default: `true`)
  - **Auto-discovery:** If `visited=true` and waypoint has no children, queries OSM for 1-3 nearby POIs (500m radius) and auto-creates child waypoints

## Project Structure

```text
backend/
  models/       → User, Waypoint (SQLAlchemy ORM)
  db/           → query functions (get, create, add, delete)
  routes/       → Flask blueprints (user, waypoint)
  services/     → OSM API calls (Overpass, Nominatim)
  app.py        → Flask init, blueprints
frontend/src/
  api/          → HTTP clients (user.ts, waypoint.ts)
  components/   → Map.tsx (Leaflet or similar)
  App.tsx       → Root component
  main.tsx      → Vite entry
```

## Setup

1. Activate venv: `.\.venv\Scripts\Activate.ps1` (Windows) or `source .venv/bin/activate` (Linux/macOS)
2. Install deps: `pip install -r backend/requirements.txt`
3. Optional: Set `DATABASE_URL` env var (default: `sqlite:///branch.db`)
4. Run: `python run.py` or `flask run`
5. Seed data: `python seed.py`

## Coding Philosophy

- DRY: Don’t Repeat Yourself — centralize shared logic and reuse it.
- KISS: Keep It Simple — prefer the simplest solution that works.
- Schema/contract-first thinking — define clear data contracts before implementation.
- Validate at boundaries — reject bad input early at system edges.
- Type safety by default — make interfaces explicit and predictable.
- Separation of concerns — organize code by responsibility.
- Single source of truth — shared rules/constants/config live in one place.
- Fail fast, fail clearly — surface errors early with actionable messages.
- Readability over cleverness — optimize for maintainability and team understanding.
- Security hygiene — never expose secrets or sensitive data.
- Deterministic behavior — stable, reproducible outputs and environments.
- Quality gates as discipline — formatting, linting, complexity checks are mandatory.
- Refactor proactively — reduce complexity instead of accumulating technical debt.
- Remove dead code — keep codebase lean and current.
- Minimal exceptions/suppressions — if bypassing rules, justify explicitly.
- Consistency over personal style — follow shared conventions project-wide.
- Build for observability — include structured logging and traceability.
- Modular design — keep modules focused and composable.
- Explicit trade-offs — avoid hidden assumptions and “magic” behavior.
- Correctness before optimization — get behavior right, then tune performance.
