import { useEffect, useState } from 'react'
import { type WaypointTree, getWaypointTree, setVisited, exploreWaypoint } from './api/waypoint'
import { type User, getUser } from './api/user'
import { Header } from './components/Header/Header'
import { Map } from './components/Map/Map'
import { WaypointPanel } from './components/WaypointPanel/WaypointPanel'
import { ErrorModal } from './components/ErrorModal/ErrorModal'

const ALL_USER_IDS = [1, 2, 3, 4]

export function App() {
  const [userId, setUserId] = useState(1)
  const [users, setUsers] = useState<User[]>([])
  const [tree, setTree] = useState<WaypointTree | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<WaypointTree | null>(null)
  const [visiting, setVisiting] = useState(false)

  function fetchTree(id: number) {
    setTree(null)
    setError(null)
    getUser(id).then(setUser).catch(() => setUser(null))
    return getWaypointTree(id)
      .then(setTree)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unknown error'))
  }

  useEffect(() => {
    Promise.all(ALL_USER_IDS.map(id => getUser(id).catch(() => null)))
      .then(results => setUsers(results.filter((u): u is User => u !== null)))
  }, [])

  useEffect(() => { fetchTree(userId) }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVisited(id: number) {
    if (!selected) return
    setVisiting(true)
    try {
      await setVisited(id)
      if (selected.children.length === 0) {
        await exploreWaypoint(userId, selected.id, selected.lat, selected.lon)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      await fetchTree(userId)
      setVisiting(false)
      setSelected(null)
    }
  }

  function handleUserSwitch(id: number) {
    setSelected(null)
    setUserId(id)
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header username={user?.username ?? '…'} userId={userId} users={users} onUserSwitch={handleUserSwitch} />
      <main className="flex-1 relative overflow-hidden">
        {tree ? (
          <Map tree={tree} onWaypointClick={setSelected} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading…
          </div>
        )}
      </main>
      {selected && (
        <WaypointPanel
          waypoint={selected}
          visiting={visiting}
          onVisited={handleVisited}
          onClose={() => !visiting && setSelected(null)}
        />
      )}
      {error && (
        <ErrorModal
          message={error}
          onReload={() => window.location.reload()}
        />
      )}
    </div>
  )
}
