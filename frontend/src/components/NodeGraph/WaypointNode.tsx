import { Handle, Position } from 'reactflow'
import { cn } from '@/lib/utils'
import { BRANCH_COLORS } from './branchColors'

export interface WaypointNodeData {
  label: string
  visited: boolean
  isRoot: boolean
  colorIdx: number // -1 = root
}

export function WaypointNode({ data }: { data: WaypointNodeData }) {
  const color =
    !data.isRoot && data.colorIdx >= 0
      ? BRANCH_COLORS[data.colorIdx % BRANCH_COLORS.length]
      : null

  const style = data.isRoot
    ? undefined
    : data.visited
      ? { borderColor: color ? color.border + '55' : undefined } // dimmed branch border
      : { borderColor: color?.border, backgroundColor: color?.bg, color: color?.text, boxShadow: `0 0 8px ${color?.glow}` }

  return (
    <div
      className={cn(
        'px-3 py-2 rounded-lg border-2 text-xs font-medium w-[90px] text-center leading-snug select-none cursor-pointer transition-colors',
        data.isRoot && 'border-amber-400 bg-amber-950 text-amber-200 shadow-[0_0_0_3px_rgba(251,191,36,0.2)] font-bold',
        !data.isRoot && data.visited && 'bg-card text-muted-foreground',
      )}
      style={style}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, top: '50%', transform: 'translateX(-50%)' }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, top: '50%', bottom: 'auto', transform: 'translateX(-50%)' }} />
    </div>
  )
}
