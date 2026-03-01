import { useEffect, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { type WaypointTree } from '../../api/waypoint'
import { WaypointNode } from './WaypointNode'
import { BRANCH_COLORS } from './branchColors'

const nodeTypes = { waypoint: WaypointNode }

const RADIUS = 170 // px per depth level

function countLeaves(node: WaypointTree): number {
  if (node.children.length === 0) return 1
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0)
}

function buildGraph(
  node: WaypointTree,
  depth: number,
  startAngle: number,
  endAngle: number,
  parentId: string | null,
  colorIdx: number, // -1 = root (amber); 0..N = branch index
  nodes: Node[],
  edges: Edge[],
  index: Map<string, WaypointTree>,
  positionCache: Map<string, { x: number; y: number }>,
): void {
  const id = String(node.id)

  // Reuse stored position so existing nodes don't move when new children are added
  let position = positionCache.get(id)
  if (!position) {
    const angle = (startAngle + endAngle) / 2
    const r = depth * RADIUS
    position = { x: r * Math.cos(angle), y: r * Math.sin(angle) }
    positionCache.set(id, position)
  }
  const { x, y } = position

  index.set(id, node)

  nodes.push({
    id,
    type: 'waypoint',
    position: { x, y },
    draggable: false,
    connectable: false,
    data: { label: node.name, visited: node.visited, isRoot: depth === 0, colorIdx },
  })

  if (parentId !== null) {
    const edgeColor =
      colorIdx >= 0
        ? BRANCH_COLORS[colorIdx % BRANCH_COLORS.length].border
        : '#034078' // blue for root → first-level edges
    edges.push({
      id: `${parentId}-${node.id}`,
      source: parentId,
      target: String(node.id),
      type: 'straight',
      style: { stroke: edgeColor, opacity: 0.5 },
    })
  }

  if (node.children.length === 0) return

  const totalLeaves = node.children.reduce((sum, c) => sum + countLeaves(c), 0)
  let cursor = startAngle
  node.children.forEach((child, i) => {
    const span = (countLeaves(child) / totalLeaves) * (endAngle - startAngle)
    // Root's direct children each get a new color; deeper nodes inherit
    const childColorIdx = depth === 0 ? i : colorIdx
    buildGraph(child, depth + 1, cursor, cursor + span, String(node.id), childColorIdx, nodes, edges, index, positionCache)
    cursor += span
  })
}

interface NodeGraphProps {
  tree: WaypointTree
  onNodeClick: (waypoint: WaypointTree) => void
}

export function NodeGraph({ tree, onNodeClick }: NodeGraphProps) {
  const indexRef = useRef(new Map<string, WaypointTree>())
  const positionCacheRef = useRef(new Map<string, { x: number; y: number }>())
  const [nodes, setNodes] = useNodesState([])
  const [edges, setEdges] = useEdgesState([])

  useEffect(() => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []
    const newIndex = new Map<string, WaypointTree>()
    buildGraph(tree, 0, 0, 2 * Math.PI, null, -1, newNodes, newEdges, newIndex, positionCacheRef.current)
    indexRef.current = newIndex
    setNodes(newNodes)
    setEdges(newEdges)
  }, [tree, setNodes, setEdges])

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    const waypoint = indexRef.current.get(node.id)
    if (waypoint) onNodeClick(waypoint)
  }

  return (
    <div className="w-screen h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        nodeOrigin={[0.5, 0.5]}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background color="#374151" gap={24} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            if (n.data.isRoot) return '#034078'
            if (n.data.visited) return '#374151'
            const idx = (n.data.colorIdx as number) ?? 0
            return BRANCH_COLORS[idx % BRANCH_COLORS.length].border
          }}
          style={{ background: '#111827' }}
        />
      </ReactFlow>
    </div>
  )
}
