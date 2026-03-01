# BR@NCH

Skill tree app: explore local areas via *Waypoints* (location nodes).

## Tech Stack

- **Backend:** Python 3.10+, Flask 3.0, SQLAlchemy 2.0, SQLite (default) / MySQL
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
| visited_at | datetime | UTC timestamp of when waypoint was marked visited (nullable) |

### JournalEntry

| Field | Type | Notes |
| ----- | ---- | ----- |
| id | int | Primary key |
| waypoint_id | int | FK → Waypoint |
| user_id | int | FK → User |
| content | str | Free-text journal note |
| created_at | datetime | UTC creation timestamp |

One entry per (user, waypoint) pair. Write-once — no editing.

## API Endpoints

### User Routes

- `GET /api/user/<id>` — Fetch user by ID, returns `{id, username, lat, lon, root_waypoint_id}`
- `POST /api/user` — Create user with `{username, lat, lon}`; `root_waypoint_id` defaults to `null`
- `PATCH /api/user/<id>/root` — Assign root waypoint; body: `{root_waypoint_id: int}`

### Waypoint Routes

- `GET /api/waypoint/<id>` — Fetch waypoint by ID, returns flat waypoint with child IDs
- `GET /api/waypoint/tree/<user_id>` — Fetch nested waypoint tree for user (recursive children)
- `POST /api/waypoint` — Create a single waypoint; body: `{lat, lon, name, api_id?}`; returns created waypoint
- `PATCH /api/waypoint/<id>/visited` — Mark waypoint as visited; body: `{visited: bool}` (default: `true`); sets/clears `visited_at` timestamp
- `PATCH /api/waypoint/<id>/children` — Add children to a waypoint; body: `{child_ids: int[]}`
- `POST /api/waypoint/osm` — Query Photon for nearby POIs and create waypoints; body: `{lat, lon, num?}`; returns up to `num` closest waypoints (sorted by distance)

### Journal Routes

- `POST /api/journal` — Save a journal entry; body: `{waypoint_id, user_id, content}`; idempotent (returns existing if already written)
- `GET /api/journal/<waypoint_id>/<user_id>` — Fetch journal entry for a (user, waypoint) pair; 404 if none

## Project Structure

```text
backend/
  models/
    user.py         → User ORM model
    waypoint.py     → Waypoint ORM model (visited_at timestamp)
    journal.py      → JournalEntry ORM model
  db/
    user_queries.py     → get/create user
    waypoint_queries.py → get, create, set_visited (stamps visited_at), build tree
    journal_queries.py  → create_journal_entry, get_journal_entry
  routes/
    user.py     → Flask blueprint: user CRUD
    waypoint.py → Flask blueprint: waypoint CRUD
    journal.py  → Flask blueprint: POST /api/journal, GET /api/journal/<wp>/<user>
  services/     → Photon API calls for POI discovery (distance-sorted results)
  app.py        → Flask init, blueprints
frontend/src/
  api/
    user.ts     → getUser, createUser, assignRootWaypoint
    waypoint.ts → getWaypoint, getWaypointTree, setVisited,
                  createWaypoint, addChildren, discoverNearby, exploreWaypoint
    journal.ts  → saveJournalEntry, getJournalEntry
  components/
    Header/         → App header; hamburger toggle (mobile) left of logo
    Map/            → Leaflet map
    SidePanel/      → Waypoint list; always visible on desktop, toggled on mobile
    WaypointPanel/  → Bottom-sheet / corner card; inline journal prompt on visit
    WaypointDetail/
    ErrorModal/
  App.tsx       → Root component; orchestrates visit + explore + journal flow
  main.tsx      → Vite entry
```

## Frontend Orchestration

Business logic lives in `frontend/src/api/waypoint.ts`, not the backend:

| Function | Description |
| -------- | ----------- |
| `createWaypoint(params)` | POST a single new waypoint |
| `addChildren(parentId, childIds)` | Link child waypoints to a parent |
| `discoverNearby(lat, lon, rad?, num?)` | Query OSM via backend, creates + returns new waypoints |
| `exploreWaypoint(userId, parentId, lat, lon, rad?, num?)` | Orchestrates `discoverNearby` → dedup → `addChildren`; returns updated parent |
| `saveJournalEntry(waypointId, userId, content)` | POST journal entry for a (user, waypoint) pair |
| `getJournalEntry(waypointId, userId)` | GET journal entry; returns `null` on 404 |

### Visit + Journal flow

1. User clicks **"I went here!"** in `WaypointPanel` (or sidebar) → panel switches inline to a textarea prompt
2. User types a note and hits **Save** (or Enter) / **Skip**
3. `App.handleVisited(waypoint, journalText?)` runs: `setVisited` → `exploreWaypoint` (if no children) → `saveJournalEntry` (if text provided) → `fetchTree`
4. On next open of a visited waypoint, `App` fetches the journal entry and passes it to `WaypointPanel` as a styled blockquote

Sidebar "I went here!" uses `onVisitRequest` → selects the waypoint, closes the sidebar, and signals `WaypointPanel` to auto-enter journal mode via the `autoJournal` prop.

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
