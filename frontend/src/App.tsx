import { useCallback, useEffect, useRef, useState } from 'react'
import { type WaypointTree, getWaypointTree, setVisited, exploreWaypoint, prepareChildren, addChildren } from './api/waypoint'
import { type User, getUser, listUsers } from './api/user'
import { saveJournalEntry, getJournalEntry } from './api/journal'
import { Header } from './components/Header/Header'
import { ALL_CATEGORIES, type Category } from './components/Header/CategoryFilter'
import { Landing } from './components/Landing/Landing'
import { Map } from './components/Map/Map'
import { WaypointPanel } from './components/WaypointPanel/WaypointPanel'
import { SidePanel } from './components/SidePanel/SidePanel'
import { ErrorModal } from './components/ErrorModal/ErrorModal'

function findInTree(node: WaypointTree, id: number): WaypointTree | null {
  if (node.id === id) return node
  for (const child of node.children) {
    const found = findInTree(child, id)
    if (found) return found
  }
  return null
}

export function App() {
  const [userId, setUserId] = useState<number | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [tree, setTree] = useState<WaypointTree | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<WaypointTree | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [visiting, setVisiting] = useState(false)
  const [pulseParentId, setPulseParentId] = useState<number | null>(null)
  const [pulsingIds, setPulsingIds] = useState<Set<number>>(new Set())
  const [panTarget, setPanTarget] = useState<WaypointTree | null>(null)
  const [journal, setJournal] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarVisitId, setSidebarVisitId] = useState<number | null>(null)
  const [radius, setRadius] = useState(5000)
  const [categories, setCategories] = useState<Category[]>([...ALL_CATEGORIES])
  const [fitTarget, setFitTarget] = useState<WaypointTree | null>(null)

  const [pageVisible, setPageVisible] = useState(true)
  const [loadingPos, setLoadingPos] = useState<{
    lat: number; lon: number
    category: string | null; visited: boolean; isRoot: boolean
  } | null>(null)

  // Stable refs for pre-fetch (avoid stale closures in useCallback)
  // Maps waypointId → created-but-not-yet-linked child IDs
  const prefetchedChildIds = useRef<Record<number, number[]>>({})
  const prefetchPromiseRef = useRef<Promise<void> | null>(null)
  const userIdRef = useRef(userId)
  const radiusRef = useRef(radius)
  const categoriesRef = useRef(categories)
  const treeRef = useRef(tree)
  useEffect(() => { userIdRef.current = userId }, [userId])
  useEffect(() => { radiusRef.current = radius }, [radius])
  useEffect(() => { categoriesRef.current = categories }, [categories])
  useEffect(() => { treeRef.current = tree }, [tree])

  function fetchTree(id: number) {
    setTree(null)
    setError(null)
    getUser(id).then(setUser).catch(() => setUser(null))
    return getWaypointTree(id)
      .then(setTree)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unknown error'))
  }

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
  }, [])

  useEffect(() => { if (userId !== null) fetchTree(userId) }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-derive selected from selectedId whenever tree changes.
  // Also consume pulseParentId: add the parent's new unvisited children to pulsingIds.
  useEffect(() => {
    if (!tree) { setSelected(null); return }
    if (selectedId !== null) {
      const found = findInTree(tree, selectedId) ?? tree
      setSelected(found)
      if (pulseParentId === null) setPanTarget(found)
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
        if (parent.children.length > 0)
          setFitTarget(parent)
      }
      setPulseParentId(null)
    }
  }, [tree]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch journal entry when a visited waypoint is selected; clear otherwise.
  useEffect(() => {
    if (selected?.visited) {
      getJournalEntry(selected.id, userId || 0).then(entry => setJournal(entry?.content ?? null)).catch(() => setJournal(null))
    } else {
      setJournal(null)
    }
  }, [selected?.id, selected?.visited, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleWaypointClick = useCallback((waypoint: WaypointTree) => {
    setSelected(waypoint)
    setSelectedId(waypoint.id)
    setSidebarOpen(false)
    setPulsingIds(prev => {
      if (!prev.has(waypoint.id)) return prev
      const next = new Set(prev)
      next.delete(waypoint.id)
      return next
    })
    setPanTarget(waypoint)

    // Pre-fetch children immediately when an unvisited leaf is selected,
    // so they're already in the DB by the time the user taps "Visited!".
    if (
      !waypoint.visited &&
      waypoint.children.length === 0 &&
      !(waypoint.id in prefetchedChildIds.current) &&
      prefetchPromiseRef.current === null
    ) {
      const numChildren = treeRef.current?.id === waypoint.id ? 4 : Math.floor(Math.random() * 2) + 1
      prefetchPromiseRef.current = prepareChildren(
        userIdRef.current || 0, waypoint.lat, waypoint.lon,
        radiusRef.current, numChildren, categoriesRef.current,
      )
        .then(childIds => { prefetchedChildIds.current[waypoint.id] = childIds })
        .catch(() => { /* silent — handleVisited falls back to inline explore */ })
        .finally(() => { prefetchPromiseRef.current = null })
    }
  }, [])

  async function handleVisited(waypoint: WaypointTree, journalText?: string) {
    if (userId === null) return
    setSidebarVisitId(null)
    setPulseParentId(waypoint.id)
    setVisiting(true)
    setLoadingPos({
      lat: waypoint.lat, lon: waypoint.lon,
      category: waypoint.category, visited: waypoint.visited,
      isRoot: tree !== null && waypoint.id === tree.id,
    })
    try {
      await setVisited(waypoint.id)
      if (waypoint.children.length === 0) {
        // Wait for any in-flight pre-fetch before deciding what to do
        if (prefetchPromiseRef.current !== null) await prefetchPromiseRef.current

        const childIds = prefetchedChildIds.current[waypoint.id]
        if (childIds !== undefined) {
          // Pre-fetch completed — link the already-created children now
          delete prefetchedChildIds.current[waypoint.id]
          if (childIds.length > 0) await addChildren(waypoint.id, childIds)
        } else {
          // No pre-fetch available — explore inline as fallback
          const numChildren = waypoint.id === tree?.id ? 4 : Math.floor(Math.random() * 2) + 1
          await exploreWaypoint(userId, waypoint.id, waypoint.lat, waypoint.lon, radius, numChildren, categories)
        }
      }
      if (journalText)
        await saveJournalEntry(waypoint.id, userId, journalText)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      await fetchTree(userId)
      setVisiting(false)
      setLoadingPos(null)
    }
  }

  function handleSidebarVisitRequest(waypoint: WaypointTree) {
    setSidebarOpen(false)
    setSelected(waypoint)
    setSelectedId(waypoint.id)
    setSidebarVisitId(waypoint.id)
  }

  function handleToggleSidebar() {
    setSidebarOpen(prev => {
      if (!prev) { setSelected(null); setSelectedId(null) }
      return !prev
    })
  }

  function handleUserSwitch(id: number) {
    setSelected(null)
    setSelectedId(null)
    setPulseParentId(null)
    setPulsingIds(new Set())
    setPanTarget(null)
    setJournal(null)
    setSidebarOpen(false)
    setLoadingPos(null)
    prefetchedChildIds.current = {}
    prefetchPromiseRef.current = null
    setUserId(id)
  }

  function handleUserSelect(id: number) {
    setPageVisible(false)
    setTimeout(() => {
      setUserId(id)
      requestAnimationFrame(() => requestAnimationFrame(() => setPageVisible(true)))
    }, 500)
  }

  function handleUserCreated(createdUser: User) {
    setUsers(prev => {
      const filtered = prev.filter(userItem => userItem.id !== createdUser.id)
      return [...filtered, createdUser].sort((a, b) => a.id - b.id)
    })
    handleUserSelect(createdUser.id)
  }

  const isRoot = !!(tree && selected?.id === tree.id)

  return (
    <div
      className="transition-opacity duration-500"
      style={{ opacity: pageVisible ? 1 : 0 }}
    >
      {userId === null ? (
        <Landing users={users} onUserSelect={handleUserSelect} onUserCreated={handleUserCreated} />
      ) : (
        <div className="flex flex-col h-screen w-screen overflow-hidden">
          <Header username={user?.username ?? '…'} userId={userId!} users={users} onUserSwitch={handleUserSwitch} sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} radius={radius} onRadiusChange={setRadius} onLogoClick={() => setUserId(null)} categories={categories} onCategoriesChange={setCategories} />
          <main className="flex-1 relative overflow-hidden">
            {tree ? (
              <>
                <Map tree={tree} selectedId={selectedId} panTarget={panTarget} pulsingIds={pulsingIds} fitTarget={fitTarget} loadingPos={loadingPos} onWaypointClick={handleWaypointClick} />
                <SidePanel
                  tree={tree}
                  selectedId={selectedId}
                  visiting={visiting}
                  open={sidebarOpen}
                  onWaypointClick={handleWaypointClick}
                  onVisitRequest={handleSidebarVisitRequest}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading…
              </div>
            )}
          </main>
          {selected && (
            <WaypointPanel
              waypoint={selected}
              isRoot={isRoot}
              visiting={visiting}
              journal={journal}
              autoJournal={sidebarVisitId === selected?.id && !selected?.visited}
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
      )}
    </div>
  )
}
