// HTTP client wrappers for /api/waypoint/*

export interface Waypoint {
    id: number;
    visited: boolean;
    api_id: string | null; // optional string reference from OSM
    lat: number;
    lon: number;
    name: string;
    children: number[];
}

/**
 * Retrieve a waypoint by its ID.
 */
export async function getWaypoint(id: number): Promise<Waypoint> {
    const res = await fetch(`/api/waypoint/${id}`);
    if (!res.ok) {
        throw new Error(`failed to fetch waypoint ${id}: ${res.status}`);
    }
    return res.json();
}

/**
 * Get child waypoint IDs for a given waypoint.
 */
export async function getChildren(id: number): Promise<number[]> {
    const res = await fetch(`/api/waypoint/${id}/children`);
    if (!res.ok) {
        throw new Error(`failed to fetch children for waypoint ${id}: ${res.status}`);
    }
    return res.json();
}

/**
 * Mark a waypoint as visited on the server.
 *
 * Returns the updated Waypoint (with visited=true) or throws on failure.
 */
export async function waypoint_set_visited(wypt_id: number): Promise<Waypoint> {
    const res = await fetch(`/api/waypoint/${wypt_id}/visited`, {
        method: "PATCH",
        body: JSON.stringify({ visited: true }),
    });
    if (!res.ok) {
        throw new Error(`failed to mark waypoint ${wypt_id} visited: ${res.status}`);
    }
    return res.json();
}
