// HTTP client wrappers for /api/journal/*

export interface JournalEntry {
    id: number
    waypoint_id: number
    user_id: number
    content: string
    created_at: string
}

export async function saveJournalEntry(
    waypointId: number,
    userId: number,
    content: string,
): Promise<JournalEntry> {
    const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoint_id: waypointId, user_id: userId, content }),
    })
    if (!res.ok) throw new Error(`Failed to save journal entry: ${res.status}`)
    return res.json() as Promise<JournalEntry>
}

export async function getJournalEntry(
    waypointId: number,
    userId: number,
): Promise<JournalEntry | null> {
    const res = await fetch(`/api/journal/${waypointId}/${userId}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Failed to fetch journal entry: ${res.status}`)
    return res.json() as Promise<JournalEntry>
}
