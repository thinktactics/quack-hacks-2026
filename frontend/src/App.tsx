import { useEffect, useState } from 'react'
import { type WaypointTree, getWaypointTree, setVisited, exploreWaypoint } from './api/waypoint'
import { type User, getUser } from './api/user'
import { Header } from './components/Header/Header'
import { Map } from './components/Map/Map'
import { WaypointPanel } from './components/WaypointPanel/WaypointPanel'
import { ErrorModal } from './components/ErrorModal/ErrorModal'

// TODO: replace with auth once login flow is built
const USER_ID = 1

export function App() {
  const [tree, setTree] = useState<WaypointTree | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<WaypointTree | null>(null)
  const [visiting, setVisiting] = useState(false)

  function fetchTree() {
    return getWaypointTree(USER_ID)
      .then(setTree)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unknown error'))
  }

  useEffect(() => {
    getUser(USER_ID).then(setUser).catch(() => {})
    fetchTree()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVisited(id: number) {
    if (!selected) return
    setVisiting(true)
    try {
      await setVisited(id)
      if (selected.children.length === 0) {
        await exploreWaypoint(id, selected.lat, selected.lon)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      await fetchTree()
      setVisiting(false)
      setSelected(null)
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header username={user?.username ?? '…'} />
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
