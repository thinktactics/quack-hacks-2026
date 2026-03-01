// HTTP client wrappers for /api/waypoint/*

export interface Waypoint {
  id: number;
  api_id: string | null;
  lat: number;
  lon: number;
  name: string;
  children: number[];
  visited: boolean;
}

export interface WaypointTree {
  id: number;
  api_id: string | null;
  lat: number;
  lon: number;
  name: string;
  children: WaypointTree[];
  visited: boolean;
}

export async function getWaypoint(id: number): Promise<Waypoint> {
  const res = await fetch(`/api/waypoint/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch waypoint ${id}: ${res.status}`)
  return res.json() as Promise<Waypoint>
}

export async function getWaypointTree(userId: number): Promise<WaypointTree> {
  const res = await fetch(`/api/waypoint/tree/${userId}`)
  if (!res.ok) throw new Error(`Failed to fetch waypoint tree for user ${userId}: ${res.status}`)
  return res.json() as Promise<WaypointTree>
}

export async function setVisited(id: number, visited: boolean = true): Promise<Waypoint> {
  const res = await fetch(`/api/waypoint/${id}/visited`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visited }),
  })
  if (!res.ok) throw new Error(`Failed to set visited on waypoint ${id}: ${res.status}`)
  return res.json() as Promise<Waypoint>
}

export async function createWaypoint(params: {
  api_id?: string;
  lat: number;
  lon: number;
  name: string;
}): Promise<Waypoint> {
  const res = await fetch('/api/waypoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`Failed to create waypoint: ${res.status}`)
  return res.json() as Promise<Waypoint>
}

export async function addChildren(parentId: number, childIds: number[]): Promise<Waypoint> {
  const res = await fetch(`/api/waypoint/${parentId}/children`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ child_ids: childIds }),
  })
  if (!res.ok) throw new Error(`Failed to add children to waypoint ${parentId}: ${res.status}`)
  return res.json() as Promise<Waypoint>
}

export async function discoverNearby(
  lat: number,
  lon: number,
  rad?: number,
  num?: number,
): Promise<Waypoint[]> {
  const res = await fetch('/api/waypoint/osm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon, rad: rad ?? 500, num: num ?? 3 }),
  })
  if (!res.ok) throw new Error(`Failed to discover nearby waypoints: ${res.status}`)
  return res.json() as Promise<Waypoint[]>
}

export async function exploreWaypoint(
  parentId: number,
  lat: number,
  lon: number,
  rad?: number,
  num?: number,
): Promise<Waypoint> {
  const waypoints = await discoverNearby(lat, lon, rad, num)
  const newIds = waypoints.map(w => w.id)
  return addChildren(parentId, newIds)
}
