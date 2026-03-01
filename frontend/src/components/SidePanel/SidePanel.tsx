import { useMemo } from 'react'
import { type WaypointTree } from '@/api/waypoint'
import { cn } from '@/lib/utils'
import { categoryColor } from '@/lib/categoryColor'

interface FlatItem {
  id: number
  name: string
  category: string | null
  visited: boolean
  isRoot: boolean
  depth: number
  node: WaypointTree
}

function flatten(node: WaypointTree, isRoot: boolean, depth: number, out: FlatItem[]): void {
  out.push({ id: node.id, name: node.name, category: node.category, visited: node.visited, isRoot, depth, node })
  node.children.forEach(c => flatten(c, false, depth + 1, out))
}

interface Props {
  tree: WaypointTree
  selectedId: number | null
  visiting: boolean
  open?: boolean
  onWaypointClick: (waypoint: WaypointTree) => void
  onVisited: (waypoint: WaypointTree) => void
  onVisitRequest: (waypoint: WaypointTree) => void
}

export function SidePanel({ tree, selectedId, visiting, open, onWaypointClick, onVisited, onVisitRequest }: Props) {
  const items = useMemo(() => {
    const out: FlatItem[] = []
    flatten(tree, true, 0, out)
    return out.sort((a, b) => Number(a.visited) - Number(b.visited) || a.depth - b.depth)
  }, [tree])

  const visitedCount = items.filter(i => i.visited).length

  return (
    <div className={cn("absolute inset-y-0 left-0 w-72 z-[1000]", open ? "flex" : "hidden md:flex")}>
      {/* Panel body */}
      <div className="flex-1 flex flex-col bg-card/80 backdrop-blur-md border-r border-border overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-border shrink-0 flex items-baseline justify-between">
          <span className="text-xs font-bold tracking-widest text-foreground uppercase">Waypoints</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {visitedCount}/{items.length}
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {items.map(wp => {
            const color = categoryColor(wp.category, wp.visited, wp.isRoot)
            const isSelected = wp.id === selectedId
            const label = wp.isRoot ? 'start' : (wp.category ?? 'place')

            return (
              <div
                key={wp.id}
                onClick={() => onWaypointClick(wp.node)}
                className={cn(
                  'px-4 py-3 cursor-pointer border-b border-border/50 transition-colors',
                  'border-l-2',
                  isSelected
                    ? 'border-l-[#034078] bg-[#034078]/8'
                    : 'border-l-transparent hover:bg-card/60',
                )}
              >
                {/* Category row */}
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                  {wp.visited && (
                    <span className="ml-auto text-[10px] text-muted-foreground tracking-wider">
                      VISITED
                    </span>
                  )}
                </div>

                {/* Name */}
                <p className={cn(
                  'text-sm leading-snug',
                  isSelected ? 'text-foreground font-semibold' : 'text-foreground/80',
                )}>
                  {wp.name}
                </p>

                {/* Visit button */}
                {!wp.visited && (
                  <button
                    className="mt-2 w-full border border-[#034078] text-[#034078] hover:bg-[#034078] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold py-1.5 transition-colors tracking-widest uppercase"
                    disabled={visiting}
                    onClick={e => { e.stopPropagation(); onVisitRequest(wp.node) }}
                  >
                    {visiting && isSelected ? 'Exploring…' : 'I went here!'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
