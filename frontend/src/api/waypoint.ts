// HTTP client wrappers for /api/waypoint/*

export interface Waypoint {
    id: number;
    api_id: string | null;
    lat: number;
    lon: number;
    name: string;
    children: number[];
    visited: boolean;
    visited_at: string | null;
    category: string | null;
}

export interface WaypointTree {
    id: number;
    api_id: string | null;
    lat: number;
    lon: number;
    name: string;
    children: WaypointTree[];
    visited: boolean;
    visited_at: string | null;
    category: string | null;
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
        body: JSON.stringify({ lat, lon, radius: rad ?? 500, num: num ?? 3 }),
    })
    if (!res.ok) throw new Error(`Failed to discover nearby waypoints: ${res.status}`)
    return res.json() as Promise<Waypoint[]>
}

// gather all waypoint api_ids and names from a user's tree; used to avoid duplicates
async function getUserWaypointApiInfo(userId: number): Promise<{ apiIds: Set<string>; names: Set<string> }> {
    const tree = await getWaypointTree(userId)
    const apiIds = new Set<string>()
    const names = new Set<string>()
    const collect = (node: WaypointTree) => {
        if (node.api_id) apiIds.add(node.api_id)
        names.add(node.name)
        node.children.forEach(collect)
    }
    collect(tree)
    return { apiIds, names }
}

export async function exploreWaypoint(
    userId: number,
    parentId: number,
    lat: number,
    lon: number,
    rad?: number,
    num?: number,
): Promise<Waypoint> {
    const target = num ?? 3
    const { apiIds, names } = await getUserWaypointApiInfo(userId)

    // fetch a large pool so deduplication filtering still leaves enough candidates
    const waypoints = await discoverNearby(lat, lon, rad, target * 5)
    const newIds = waypoints
        .filter(w => {
            if (w.api_id && apiIds.has(w.api_id)) return false
            if (names.has(w.name)) return false
            return true
        })
        .slice(0, target)
        .map(w => w.id)

    if (newIds.length === 0) return getWaypoint(parentId)
    return addChildren(parentId, newIds)
}
