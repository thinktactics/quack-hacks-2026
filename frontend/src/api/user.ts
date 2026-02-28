// HTTP client wrappers for /api/user/*

export interface User {
    id: number;
    username: string;
    root_waypoint_id: number;
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

/**
 * Create a new user on the backend.
 *
 * @param username - desired username
 * @param password - plaintext password (will be hashed by server)
 * @returns created user object
 */
export async function createUser(username: string, password: string): Promise<User> {
    const res = await fetch(`/api/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
        throw new Error(`failed to create user: ${res.status}`);
    }
    return res.json();
}
