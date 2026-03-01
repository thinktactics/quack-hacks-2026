// HTTP client wrappers for /api/waypoint/*

export interface Waypoint {
  id: number
  visited: boolean
  api_id: string | null
  lat: number
  lon: number
  name: string
  children: number[]
}

// Recursive tree shape returned by /api/waypoint/tree/<user_id>
export interface WaypointTree extends Omit<Waypoint, 'children'> {
  children: WaypointTree[]
}

/** Fetch a single waypoint by ID. */
export async function getWaypoint(id: number): Promise<Waypoint> {
  const res = await fetch(`/api/waypoint/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch waypoint ${id}: ${res.status}`)
  return res.json() as Promise<Waypoint>
}

/**
 * Mark a waypoint visited and return the updated waypoint from the server.
 * Use this when you need the confirmed server state.
 */
export async function setVisited(id: number): Promise<Waypoint> {
  const res = await fetch(`/api/waypoint/${id}/visited`, { method: 'PATCH' })
  if (!res.ok) throw new Error(`Failed to mark waypoint ${id} visited: ${res.status}`)
  return res.json() as Promise<Waypoint>
}

/**
 * Fire-and-forget visited update used by the UI.
 * Local state is the source of truth; server sync is best-effort.
 */
export async function markVisited(id: number): Promise<void> {
  await setVisited(id).catch(() => undefined)
}

/** Fetch the full recursive waypoint tree for a user. Falls back to mock data. */
export async function getWaypointTree(userId: number): Promise<WaypointTree> {
  try {
    const res = await fetch(`/api/waypoint/tree/${userId}`)
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json() as Promise<WaypointTree>
  } catch {
    const { mockWaypointTree } = await import('@/mocks/waypointTree')
    return mockWaypointTree
  }
}
