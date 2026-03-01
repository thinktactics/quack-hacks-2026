// HTTP client wrappers for /api/user/*

export interface User {
    id: number;
    username: string;
    lat: number;
    lon: number;
    root_waypoint_id: number | null;
}

export interface AddressSearchResult {
    name: string;
    lat: number;
    lon: number;
}

export async function listUsers(): Promise<User[]> {
    const res = await fetch(`/api/user`);
    if (!res.ok) {
        throw new Error(`failed to list users: ${res.status}`);
    }
    return res.json();
}

/**
 * Fetch a user by ID from the backend.
 *
 * @param id - numeric user id
 * @returns the user object as returned by the API
 */
export async function getUser(id: number): Promise<User> {
    const res = await fetch(`/api/user/${id}`);
    if (!res.ok) {
        throw new Error(`failed to fetch user ${id}: ${res.status}`);
    }
    return res.json();
}

export async function createUser(username: string, lat: number, lon: number): Promise<User> {
    const res = await fetch(`/api/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, lat, lon }),
    });
    if (!res.ok) {
        throw new Error(`failed to create user: ${res.status}`);
    }
    return res.json();
}

export async function searchAddress(query: string, limit: number = 5): Promise<AddressSearchResult[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const res = await fetch(`/api/user/address-search?${params.toString()}`);
    if (!res.ok) {
        throw new Error(`failed to search address: ${res.status}`);
    }
    return res.json();
}

export async function assignRootWaypoint(userId: number, waypointId: number): Promise<User> {
    const res = await fetch(`/api/user/${userId}/root`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ root_waypoint_id: waypointId }),
    });
    if (!res.ok) {
        throw new Error(`failed to assign root waypoint for user ${userId}: ${res.status}`);
    }
    return res.json();
}
