export interface BranchColor {
  border: string
  bg: string
  text: string
  glow: string
}

export const BRANCH_COLORS: BranchColor[] = [
  { border: '#818cf8', bg: '#1e1b4b', text: '#c7d2fe', glow: 'rgba(129,140,248,0.25)' }, // indigo
  { border: '#34d399', bg: '#022c22', text: '#a7f3d0', glow: 'rgba(52,211,153,0.25)' },  // emerald
  { border: '#fb923c', bg: '#431407', text: '#fed7aa', glow: 'rgba(251,146,60,0.25)' },  // orange
  { border: '#f472b6', bg: '#500724', text: '#fbcfe8', glow: 'rgba(244,114,182,0.25)' }, // pink
  { border: '#38bdf8', bg: '#082f49', text: '#bae6fd', glow: 'rgba(56,189,248,0.25)' },  // sky
  { border: '#a3e635', bg: '#1a2e05', text: '#d9f99d', glow: 'rgba(163,230,53,0.25)' },  // lime
]
