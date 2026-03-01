import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { type WaypointTree } from '@/api/waypoint'
import { categoryColor } from '@/lib/categoryColor'

interface FlatWaypoint {
  id: number
  name: string
  lat: number
  lon: number
  visited: boolean
  api_id: string | null
  category: string | null
  isRoot: boolean
  parentId: number | null
  node: WaypointTree
}

function flattenTree(
  node: WaypointTree,
  isRoot: boolean,
  parentId: number | null,
  result: FlatWaypoint[],
  seenApiIds: Set<string>,
): void {
  if (node.api_id && seenApiIds.has(node.api_id)) return
  if (node.api_id) seenApiIds.add(node.api_id)

  result.push({
    id: node.id, name: node.name, lat: node.lat, lon: node.lon,
    visited: node.visited, api_id: node.api_id, category: node.category, isRoot, parentId, node,
  })
  node.children.forEach(child => {
    flattenTree(child, false, node.id, result, seenApiIds)
  })
}

function makeIcon(category: string | null, visited: boolean, isRoot: boolean, pulse: boolean, selected: boolean): L.DivIcon {
  const color = categoryColor(category, visited, isRoot)
  const base = isRoot ? 28 : 20
  const size = selected ? Math.round(base * 1.75) : base
  const cls = pulse ? 'marker-pulse' : ''
  const border = selected ? 'border:3px solid #ffffff;box-sizing:border-box;' : ''
  return L.divIcon({
    className: '',
    html: `<div class="${cls}" style="width:${size}px;height:${size}px;border-radius:50%;background:${color};${border}box-shadow:0 2px 4px rgba(0,0,0,0.5);cursor:pointer;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function makeLoadingIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:24px;height:24px;overflow:visible;">
      <div class="explore-ping"></div>
      <div class="explore-ping" style="animation-delay:0.75s"></div>
      <div class="explore-ping" style="animation-delay:1.5s"></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

interface Props {
  tree: WaypointTree
  selectedId: number | null
  panTarget: WaypointTree | null
  pulsingIds: Set<number>
  fitTarget: WaypointTree | null
  loadingPos: { lat: number; lon: number } | null
  onWaypointClick: (waypoint: WaypointTree) => void
}

function drawPolylines(node: WaypointTree, map: L.Map, lines: L.Polyline[], seenIds: Set<number>): void {
  if (seenIds.has(node.id)) return
  seenIds.add(node.id)
  node.children.forEach(child => {
    const line = L.polyline([[node.lat, node.lon], [child.lat, child.lon]], {
      color: 'hsl(var(--foreground))',
      opacity: 1,
      weight: 2,
    }).addTo(map)
    lines.push(line)
    drawPolylines(child, map, lines, seenIds)
  })
}

function tileUrl(dark: boolean) {
  return dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'
}

export function Map({ tree, selectedId, panTarget, pulsingIds, fitTarget, loadingPos, onWaypointClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const polylinesRef = useRef<L.Polyline[]>([])
  const loadingMarkerRef = useRef<L.Marker | null>(null)
  const flatRef = useRef<FlatWaypoint[]>([])
  const pulsingIdsRef = useRef<Set<number>>(pulsingIds)
  const selectedIdRef = useRef<number | null>(selectedId)

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [tree.lat, tree.lon],
      zoom: 15,
      zoomControl: false,
    })

    const dark = document.documentElement.classList.contains('dark')
    tileLayerRef.current = L.tileLayer(tileUrl(dark), {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      tileLayerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Swap tile layer when theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark')
      tileLayerRef.current?.setUrl(tileUrl(dark))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Sync markers, polylines, and fit bounds whenever tree changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    polylinesRef.current.forEach(p => p.remove())
    polylinesRef.current = []

    const flat: FlatWaypoint[] = []
    flattenTree(tree, true, null, flat, new Set())
    flatRef.current = flat

    drawPolylines(tree, map, polylinesRef.current, new Set())

    flat.forEach(wp => {
      const pulse = pulsingIdsRef.current.has(wp.id) && !wp.visited
      const selected = selectedIdRef.current !== null && wp.id === selectedIdRef.current
      const marker = L.marker([wp.lat, wp.lon], {
        icon: makeIcon(wp.category, wp.visited, wp.isRoot, pulse, selected),
      })
        .addTo(map)
        .on('click', () => onWaypointClick(wp.node))
      markersRef.current.push(marker)
    })

    if (flat.length > 0 && selectedIdRef.current === null) {
      const bounds = L.latLngBounds(flat.map(wp => [wp.lat, wp.lon] as L.LatLngTuple))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [tree, onWaypointClick])

  // Update icons only when pulsingIds changes (no full rebuild)
  useEffect(() => {
    pulsingIdsRef.current = pulsingIds
    flatRef.current.forEach((wp, i) => {
      const marker = markersRef.current[i]
      if (!marker) return
      const pulse = pulsingIds.has(wp.id) && !wp.visited
      const selected = selectedIdRef.current !== null && wp.id === selectedIdRef.current
      marker.setIcon(makeIcon(wp.category, wp.visited, wp.isRoot, pulse, selected))
    })
  }, [pulsingIds])

  // Update icons only when selectedId changes (no full rebuild)
  useEffect(() => {
    selectedIdRef.current = selectedId
    flatRef.current.forEach((wp, i) => {
      const marker = markersRef.current[i]
      if (!marker) return
      const pulse = pulsingIdsRef.current.has(wp.id) && !wp.visited
      const selected = selectedId !== null && wp.id === selectedId
      marker.setIcon(makeIcon(wp.category, wp.visited, wp.isRoot, pulse, selected))
    })
  }, [selectedId])

  // After visiting a node, fit bounds to include it and all its new children.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !fitTarget) return
    const points: L.LatLngTuple[] = [
      [fitTarget.lat, fitTarget.lon],
      ...fitTarget.children.map(c => [c.lat, c.lon] as L.LatLngTuple),
    ]
    map.fitBounds(L.latLngBounds(points), { padding: [80, 80], maxZoom: 15, animate: true })
  }, [fitTarget])

  // Show/hide sonar loading marker while exploring a visited waypoint
  useEffect(() => {
    loadingMarkerRef.current?.remove()
    loadingMarkerRef.current = null
    const map = mapRef.current
    if (!map || !loadingPos) return
    const m = L.marker([loadingPos.lat, loadingPos.lon], { icon: makeLoadingIcon(), zIndexOffset: 1000 }).addTo(map)
    loadingMarkerRef.current = m
    return () => { m.remove(); loadingMarkerRef.current = null }
  }, [loadingPos])

  // Pan to target when user clicks a node.
  // On mobile, offset the center so the target lands at ~1/3 from the top
  // rather than dead-center (which would be behind the bottom panel).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !panTarget) return
    if (window.innerWidth < 768) {
      const zoom = map.getZoom()
      const targetPx = map.project([panTarget.lat, panTarget.lon], zoom)
      const centerPx = targetPx.add([0, map.getSize().y / 6])
      map.panTo(map.unproject(centerPx, zoom), { animate: true })
    } else {
      map.panTo([panTarget.lat, panTarget.lon], { animate: true })
    }
  }, [panTarget])

  return <div ref={containerRef} className="w-full h-full" />
}
