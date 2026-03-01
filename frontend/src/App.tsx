import { useEffect, useState } from 'react'
import { type WaypointTree, getWaypointTree, setVisited } from './api/waypoint'
import { NodeGraph } from './components/NodeGraph/NodeGraph'
import { WaypointDetail } from './components/WaypointDetail/WaypointDetail'

// TODO: replace with auth once login flow is built
const USER_ID = 1

export function App() {
  const [tree, setTree] = useState<WaypointTree | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<WaypointTree | null>(null)
  const [visiting, setVisiting] = useState(false)

  function fetchTree() {
    return getWaypointTree(USER_ID)
      .then(setTree)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unknown error'))
  }

  useEffect(() => { fetchTree() }, [])

  async function handleVisited(id: number) {
    setVisiting(true)
    try {
      await setVisited(id)
      await fetchTree()
    } finally {
      setVisiting(false)
      setSelected(null)
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        {error}
      </div>
    )
  }

  if (!tree) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading...
      </div>
    )
  }

  return (
    <>
      <NodeGraph tree={tree} onNodeClick={setSelected} />
      {selected && (
        <WaypointDetail
          waypoint={selected}
          visiting={visiting}
          onVisited={handleVisited}
          onClose={() => !visiting && setSelected(null)}
        />
      )}
    </>
  )
}
