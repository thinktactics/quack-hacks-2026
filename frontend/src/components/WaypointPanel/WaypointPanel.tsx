import { useEffect, useState } from 'react'
import { type WaypointTree } from '@/api/waypoint'

interface Props {
  waypoint: WaypointTree
  visiting: boolean
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

export function WaypointPanel({ waypoint, visiting, onVisited, onClose }: Props) {
  const [address, setAddress] = useState('Loading address…')

  useEffect(() => {
    setAddress('Loading address…')
    reverseGeocode(waypoint.lat, waypoint.lon)
      .then(setAddress)
      .catch(() => setAddress('—'))
  }, [waypoint.lat, waypoint.lon])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[2000] bg-black/40"
        onClick={() => !visiting && onClose()}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[2001] bg-card border-t border-border rounded-t-2xl shadow-2xl p-5 pb-10">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />

        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground leading-none"
          onClick={() => !visiting && onClose()}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Name */}
        <h2 className="text-lg font-bold text-foreground mb-3 pr-6">{waypoint.name}</h2>

        {/* Details */}
        <dl className="space-y-2 text-sm mb-5">
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
            <dd className={waypoint.visited ? 'text-muted-foreground' : 'text-amber-400 font-medium'}>
              {waypoint.visited ? 'Visited' : 'Not visited'}
            </dd>
          </div>
        </dl>

        {/* Visited button */}
        {!waypoint.visited && (
          <button
            className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 text-base transition-colors"
            disabled={visiting}
            onClick={() => onVisited(waypoint.id)}
          >
            {visiting ? 'Finding nearby spots…' : 'Visited!'}
          </button>
        )}
      </div>
    </>
  )
}
