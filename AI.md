# BR@NCH
A web application that functions as a "skill tree" for exploring your local area, based on a system
of *Waypoints*, or nodes, that contain a location.

## Definition
- Waypoint

## Tech Stack
- Backend: python, flask, mySQL
- Frontend: Node.js, npm, vite

## Schemas
...TODO...

## Backend
...TODO...

## Frontend
- React app.
- View: 
- On new user:
    - Allow user to enter location
    - Set "root" waypoint
- On returning user
    - Show "tree" of waypoints
    - On waypoints visited, use the selection algorithm to choose N children of that waypoint.
    - Display each new waypoint as unvisited node.
    - Allow user to click off any node.
