import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { type WaypointTree } from '@/api/waypoint'
import { BRANCH_COLORS } from '@/components/NodeGraph/branchColors'

interface FlatWaypoint {
  id: number
  name: string
  lat: number
  lon: number
  visited: boolean
  api_id: string | null
  colorIdx: number
  isRoot: boolean
  node: WaypointTree
}

function flattenTree(
  node: WaypointTree,
  colorIdx: number,
  isRoot: boolean,
  result: FlatWaypoint[],
): void {
  result.push({
    id: node.id, name: node.name, lat: node.lat, lon: node.lon,
    visited: node.visited, api_id: node.api_id, colorIdx, isRoot, node,
  })
  node.children.forEach((child, i) => {
    flattenTree(child, isRoot ? i : colorIdx, false, result)
  })
}

function makeIcon(colorIdx: number, visited: boolean, isRoot: boolean): L.DivIcon {
  const color = isRoot
    ? '#f59e0b'
    : visited
    ? '#4b5563'
    : BRANCH_COLORS[colorIdx % BRANCH_COLORS.length].border
  const size = isRoot ? 20 : 14
  const glow = !visited && !isRoot
    ? BRANCH_COLORS[colorIdx % BRANCH_COLORS.length].glow
    : 'transparent'
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 8px ${glow},0 2px 4px rgba(0,0,0,0.5);cursor:pointer;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

interface Props {
  tree: WaypointTree
  onWaypointClick: (waypoint: WaypointTree) => void
}

export function Map({ tree, onWaypointClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [tree.lat, tree.lon],
      zoom: 15,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync markers whenever tree changes (no re-centering)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const flat: FlatWaypoint[] = []
    flattenTree(tree, 0, true, flat)

    flat.forEach(wp => {
      const marker = L.marker([wp.lat, wp.lon], {
        icon: makeIcon(wp.colorIdx, wp.visited, wp.isRoot),
      })
        .addTo(map)
        .on('click', () => onWaypointClick(wp.node))
      markersRef.current.push(marker)
    })
  }, [tree, onWaypointClick])

  return <div ref={containerRef} className="w-full h-full" />
}
