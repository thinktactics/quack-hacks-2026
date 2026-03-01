import { useCallback, useEffect, useState } from 'react'
import { type WaypointTree, getWaypointTree, setVisited, exploreWaypoint } from './api/waypoint'
import { type User, getUser } from './api/user'
import { Header } from './components/Header/Header'
import { Map } from './components/Map/Map'
import { WaypointPanel } from './components/WaypointPanel/WaypointPanel'
import { ErrorModal } from './components/ErrorModal/ErrorModal'

const ALL_USER_IDS = [1, 2, 3, 4]

function findInTree(node: WaypointTree, id: number): WaypointTree | null {
  if (node.id === id) return node
  for (const child of node.children) {
    const found = findInTree(child, id)
    if (found) return found
  }
  return null
}

export function App() {
  const [userId, setUserId] = useState(1)
  const [users, setUsers] = useState<User[]>([])
  const [tree, setTree] = useState<WaypointTree | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<WaypointTree | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [visiting, setVisiting] = useState(false)
  // pulseParentId: temporary signal — after tree refresh, add this node's new children to pulsingIds
  const [pulseParentId, setPulseParentId] = useState<number | null>(null)
  const [pulsingIds, setPulsingIds] = useState<Set<number>>(new Set())
  const [panTarget, setPanTarget] = useState<WaypointTree | null>(null)

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

  // Re-derive selected from selectedId whenever tree changes.
  // Also consume pulseParentId: add the parent's new unvisited children to pulsingIds.
  useEffect(() => {
    if (!tree) { setSelected(null); return }
    if (selectedId !== null) {
      const found = findInTree(tree, selectedId) ?? tree
      setSelected(found)
      setPanTarget(found)
    } else {
      setSelected(tree)
      setSelectedId(tree.id)
    }
    if (pulseParentId !== null) {
      const parent = findInTree(tree, pulseParentId)
      if (parent) {
        const newIds = parent.children.filter(c => !c.visited).map(c => c.id)
        if (newIds.length > 0)
          setPulsingIds(prev => new Set([...prev, ...newIds]))
      }
      setPulseParentId(null)
    }
  }, [tree]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleWaypointClick = useCallback((waypoint: WaypointTree) => {
    setSelected(waypoint)
    setSelectedId(waypoint.id)
    // Remove only this node from the pulsing set — others keep pulsing
    setPulsingIds(prev => {
      if (!prev.has(waypoint.id)) return prev
      const next = new Set(prev)
      next.delete(waypoint.id)
      return next
    })
    setPanTarget(waypoint)
  }, [])

  async function handleVisited(id: number) {
    if (!selected) return
    setPulseParentId(selected.id) // tree-sync effect will pulse new children after refresh
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
    }
  }

  function handleUserSwitch(id: number) {
    setSelected(null)
    setSelectedId(null)
    setPulseParentId(null)
    setPulsingIds(new Set())
    setPanTarget(null)
    setUserId(id)
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header username={user?.username ?? '…'} userId={userId} users={users} onUserSwitch={handleUserSwitch} />
      <main className="flex-1 relative overflow-hidden">
        {tree ? (
          <Map tree={tree} selectedId={selectedId} panTarget={panTarget} pulsingIds={pulsingIds} onWaypointClick={handleWaypointClick} />
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
          onClose={() => { if (!visiting) { setSelected(null); setSelectedId(null) } }}
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
