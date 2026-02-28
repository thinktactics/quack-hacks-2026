import { type WaypointTree } from '@/api/waypoint'

// IDs start well above the mock fixture IDs (1–6) to avoid collisions
let nextId = 1000

const PLACE_NAMES = [
  'Riverside Café', 'Oak Street Park', 'The Old Library', 'Harbor View',
  'Central Market', 'Maple Grove', 'The Clocktower', 'Museum of Art',
  'Garden Square', 'The Waterfront', 'Pine Street Plaza', 'Historic District',
  'Community Center', 'Lakeside Trail', 'The Fountain', 'Sunset Overlook',
  "Farmer's Market", 'Bell Tower', 'Covered Bridge', 'Village Green',
  'Cobblestone Alley', 'The Boathouse', 'Grand Staircase', 'Rooftop Garden',
]

function pickName(): string {
  return PLACE_NAMES[Math.floor(Math.random() * PLACE_NAMES.length)]
}

/** Simulates the server suggesting 2 nearby waypoints after a visit. */
export function generateMockChildren(parent: WaypointTree): WaypointTree[] {
  return [0, 1].map(() => ({
    id: nextId++,
    api_id: null,
    // Offset ±0.003 deg (~300 m) so children cluster near the parent
    lat: parent.lat + (Math.random() - 0.5) * 0.006,
    lon: parent.lon + (Math.random() - 0.5) * 0.006,
    name: pickName(),
    visited: false,
    children: [],
    children_nodes: [],
  }))
}
