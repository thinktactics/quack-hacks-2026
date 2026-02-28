import { useEffect, useState } from 'react'
import { type WaypointTree } from '@/api/waypoint'
import { cn } from '@/lib/utils'

interface Props {
  waypoint: WaypointTree
  onVisited: (id: number) => void
  onClose: () => void
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    { headers: { 'Accept-Language': 'en' } },
  )
  if (!res.ok) throw new Error('geocode failed')
  const data = await res.json() as { display_name?: string }
  return data.display_name ?? '—'
}

export function WaypointDetail({ waypoint, onVisited, onClose }: Props) {
  const [address, setAddress] = useState<string>('Loading address…')

  useEffect(() => {
    setAddress('Loading address…')
    reverseGeocode(waypoint.lat, waypoint.lon)
      .then(setAddress)
      .catch(() => setAddress('—'))
  }, [waypoint.lat, waypoint.lon])

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      {/* Panel — stop click propagation so clicking inside doesn't close */}
      <div
        className="relative w-full max-w-sm rounded-xl border border-border bg-card text-card-foreground shadow-2xl p-6 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="absolute top-3 right-4 text-muted-foreground hover:text-foreground text-lg leading-none"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Name */}
        <h2 className="text-lg font-bold text-foreground mb-4 pr-6">{waypoint.name}</h2>

        {/* Details */}
        <dl className="space-y-2 text-sm mb-6">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Latitude</dt>
            <dd className="font-mono text-foreground">{waypoint.lat.toFixed(5)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Longitude</dt>
            <dd className="font-mono text-foreground">{waypoint.lon.toFixed(5)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Address</dt>
            <dd className="text-foreground leading-snug">{address}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Status</dt>
            <dd className={cn('font-medium', waypoint.visited ? 'text-muted-foreground' : 'text-indigo-300')}>
              {waypoint.visited ? 'Visited' : 'Not visited'}
            </dd>
          </div>
        </dl>

        {/* Visited button */}
        {!waypoint.visited && (
          <button
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2 transition-colors"
            onClick={() => { onVisited(waypoint.id); onClose() }}
          >
            Visited!
          </button>
        )}
      </div>
    </div>
  )
}
