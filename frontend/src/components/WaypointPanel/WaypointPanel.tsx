import { useEffect, useState } from 'react'
import { type WaypointTree } from '@/api/waypoint'
import { categoryColor } from '@/lib/categoryColor'

interface Props {
  waypoint: WaypointTree
  isRoot: boolean
  visiting: boolean
  journal?: string | null
  autoJournal?: boolean
  onVisited: (waypoint: WaypointTree, journalText?: string) => void
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

export function WaypointPanel({ waypoint, isRoot, visiting, journal, autoJournal, onVisited, onClose }: Props) {
  const [address, setAddress] = useState('Loading address…')
  const [journalMode, setJournalMode] = useState(false)
  const [journalText, setJournalText] = useState('')

  useEffect(() => {
    setAddress('Loading address…')
    reverseGeocode(waypoint.lat, waypoint.lon)
      .then(setAddress)
      .catch(() => setAddress('—'))
  }, [waypoint.lat, waypoint.lon])

  // Reset journal mode when the selected waypoint changes.
  useEffect(() => {
    setJournalMode(false)
    setJournalText('')
  }, [waypoint.id])

  // Auto-enter journal mode when triggered from outside (e.g. sidebar).
  useEffect(() => {
    if (autoJournal) setJournalMode(true)
  }, [autoJournal])

  const dot = categoryColor(waypoint.category, waypoint.visited, isRoot)
  const label = isRoot ? 'start' : (waypoint.category ?? 'place')

  function handleSave() {
    onVisited(waypoint, journalText.trim() || undefined)
    setJournalMode(false)
  }

  function handleSkip() {
    onVisited(waypoint, undefined)
    setJournalMode(false)
  }

  return (
    <>
      {/* Panel: bottom sheet on mobile, fixed corner card on desktop */}
      <div className="fixed z-[2001] bg-card border-border shadow-2xl p-5
        bottom-0 left-0 right-0 border-t pb-10
        md:top-auto md:bottom-4 md:right-4 md:left-auto md:w-80 md:border md:pb-5">
        {/* Drag handle — mobile only */}
        <div className="md:hidden w-10 h-1 bg-muted-foreground/30 mx-auto mb-4" />

        {/* Close button — mobile only */}
        <button
          className="md:hidden absolute top-4 right-4 text-muted-foreground hover:text-foreground leading-none"
          onClick={() => !visiting && onClose()}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Category badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>

        {/* Name */}
        <h2 className="text-lg font-bold text-foreground mb-3 pr-6 md:pr-0">{waypoint.name}</h2>

        {/* Journal entry prompt — shown when user clicked "I went here!" */}
        {journalMode && !waypoint.visited ? (
          <div className="space-y-2">
            <textarea
              className="w-full border border-border bg-background text-foreground text-sm p-2 resize-none h-28 focus:outline-none focus:border-[#034078]"
              placeholder="Add a note?"
              value={journalText}
              onChange={e => setJournalText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() } }}
              autoFocus
            />
            <button
              className="w-full bg-[#034078] hover:bg-[#0a5599] active:bg-[#022d56] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 text-base transition-colors"
              disabled={visiting}
              onClick={handleSave}
            >
              {visiting ? 'Exploring…' : 'Save'}
            </button>
            <button
              className="w-full border border-border text-muted-foreground text-sm py-2 hover:text-foreground transition-colors"
              disabled={visiting}
              onClick={handleSkip}
            >
              Skip
            </button>
          </div>
        ) : (
          <>
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
                <dd className="leading-snug">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#034078] dark:text-[#5aacdf] underline underline-offset-2 hover:opacity-75 transition-opacity"
                  >
                    {address}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd className={waypoint.visited ? 'text-muted-foreground' : 'text-[#034078] font-medium'}>
                  {waypoint.visited ? 'Visited' : 'Not visited'}
                </dd>
              </div>
              {waypoint.visited && waypoint.visited_at && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Visited</dt>
                  <dd className="font-mono text-foreground text-xs">
                    {new Date(waypoint.visited_at).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>

            {/* Journal entry display */}
            {waypoint.visited && journal && (
              <blockquote className="mt-3 border-l-2 border-[#034078] pl-3 pr-3 py-2 text-sm text-foreground/80 italic bg-muted/40">
                "{journal}"
              </blockquote>
            )}

            {/* Visited button */}
            {!waypoint.visited && (
              <button
                className="w-full bg-[#034078] hover:bg-[#0a5599] active:bg-[#022d56] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 text-base transition-colors"
                disabled={visiting}
                onClick={() => setJournalMode(true)}
              >
                {visiting ? 'Exploring…' : 'I went here!'}
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}
