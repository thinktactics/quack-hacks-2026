import { useEffect, useState } from 'react'
import { type WaypointTree, getWaypointTree, markVisited } from './api/waypoint'
import { generateMockChildren } from './mocks/generateChildren'
import { NodeGraph } from './components/NodeGraph/NodeGraph'
import { WaypointDetail } from './components/WaypointDetail/WaypointDetail'

// TODO: replace with auth once login flow is built
const USER_ID = 1

/** Marks a node as visited and splices in new children — single recursive pass. */
function applyVisited(node: WaypointTree, id: number, newChildren: WaypointTree[]): WaypointTree {
  if (node.id === id) {
    return {
      ...node,
      visited: true,
      children: [...node.children, ...newChildren.map((c) => c.id)],
      children_nodes: [...node.children_nodes, ...newChildren],
    }
  }
  return { ...node, children_nodes: node.children_nodes.map((c) => applyVisited(c, id, newChildren)) }
}

export function App() {
  const [tree, setTree] = useState<WaypointTree | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<WaypointTree | null>(null)

  useEffect(() => {
    getWaypointTree(USER_ID)
      .then(setTree)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unknown error'))
  }, [])

  function handleVisited(id: number) {
    if (!selected) return
    markVisited(id)
    const newChildren = generateMockChildren(selected)
    setTree((prev) => (prev ? applyVisited(prev, id, newChildren) : prev))
    setSelected((prev) => (prev?.id === id ? { ...prev, visited: true } : prev))
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
          onVisited={handleVisited}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
