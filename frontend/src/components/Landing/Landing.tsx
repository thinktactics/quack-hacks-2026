import { useEffect, useRef, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type AddressSearchResult, assignRootWaypoint, createUser, searchAddress, type User } from '@/api/user'
import { createWaypoint } from '@/api/waypoint'

const MAX_DEPTH = 6

class Branch {
  x: number; y: number; angle: number; length: number; depth: number
  speed: number; progress: number; done: boolean
  children: Branch[]; spawned: boolean; alpha: number

  constructor(x: number, y: number, angle: number, length: number, depth: number, speed: number) {
    this.x = x; this.y = y; this.angle = angle; this.length = length
    this.depth = depth; this.speed = speed
    this.progress = 0; this.done = false; this.children = []; this.spawned = false
    this.alpha = 1 - depth / (MAX_DEPTH + 1)
  }

  update() {
    if (this.done) { this.children.forEach(c => c.update()); return }
    this.progress += this.speed
    if (this.progress >= 1) {
      this.progress = 1; this.done = true
      if (this.depth < MAX_DEPTH && !this.spawned) {
        this.spawned = true
        const numBranches = Math.random() < 0.3 ? 3 : 2
        const spread = 0.3 + Math.random() * 0.4
        for (let i = 0; i < numBranches; i++) {
          const angleOffset = (i - (numBranches - 1) / 2) * spread
          const childAngle = this.angle + angleOffset + (Math.random() - 0.5) * 0.2
          const childLen = this.length * (0.6 + Math.random() * 0.25)
          const childSpeed = this.speed * (0.85 + Math.random() * 0.3)
          const ex = this.x + Math.cos(this.angle) * this.length
          const ey = this.y + Math.sin(this.angle) * this.length
          this.children.push(new Branch(ex, ey, childAngle, childLen, this.depth + 1, childSpeed))
        }
      }
    }
    this.children.forEach(c => c.update())
  }

  // color passed in so it always reflects the current theme
  draw(ctx: CanvasRenderingContext2D, color: string) {
    const ex = this.x + Math.cos(this.angle) * this.length * this.progress
    const ey = this.y + Math.sin(this.angle) * this.length * this.progress
    ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(ex, ey)
    ctx.strokeStyle = color
    ctx.globalAlpha = this.alpha * (0.4 + 0.6 * (1 - this.depth / MAX_DEPTH))
    ctx.lineWidth = Math.max(0.3, 2 - this.depth * 0.28)
    ctx.shadowBlur = 0; ctx.stroke(); ctx.globalAlpha = 1
    this.children.forEach(c => c.draw(ctx, color))
  }

  isFullyDone(): boolean {
    if (!this.done) return false
    return this.children.every(c => c.isFullyDone())
  }
}

function spawnRoot(canvas: HTMLCanvasElement, branches: Branch[]) {
  const edge = Math.floor(Math.random() * 4)
  let x = 0, y = 0, angle = 0
  const W = canvas.width, H = canvas.height
  if (edge === 0) { x = Math.random() * W; y = 0; angle = Math.PI / 2 + (Math.random() - 0.5) * 0.8 }
  else if (edge === 1) { x = W; y = Math.random() * H; angle = Math.PI + (Math.random() - 0.5) * 0.8 }
  else if (edge === 2) { x = Math.random() * W; y = H; angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8 }
  else { x = 0; y = Math.random() * H; angle = (Math.random() - 0.5) * 0.8 }
  const len = 60 + Math.random() * 80
  branches.push(new Branch(x, y, angle, len, 0, 0.012 + Math.random() * 0.01))
}

interface Props {
  users: User[]
  onUserSelect: (id: number) => void
  onUserCreated: (user: User) => void
}

export function Landing({ users, onUserSelect, onUserCreated }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDarkRef = useRef(false)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') !== 'light')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [addressQuery, setAddressQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [signingUp, setSigningUp] = useState(false)
  const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([])
  const [selectedAddress, setSelectedAddress] = useState<AddressSearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAddressSearch() {
    const query = addressQuery.trim()
    if (!query) return
    setError(null)
    setSearching(true)
    try {
      const results = await searchAddress(query)
      setSearchResults(results)
      setSelectedAddress(results[0] ?? null)
      if (results.length === 0) setError('No addresses found. Try a broader query.')
    } catch {
      setError('Address search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function handleSignup() {
    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      setError('Username is required.')
      return
    }
    if (!selectedAddress) {
      setError('Please search and select an address first.')
      return
    }

    setError(null)
    setSigningUp(true)
    try {
      const createdUser = await createUser(
        trimmedUsername,
        selectedAddress.lat,
        selectedAddress.lon,
      )

      const rootWaypoint = await createWaypoint({
        api_id: `root/${createdUser.id}/${Date.now()}`,
        lat: selectedAddress.lat,
        lon: selectedAddress.lon,
        name: selectedAddress.name,
      })

      const updatedUser = await assignRootWaypoint(createdUser.id, rootWaypoint.id)
      onUserCreated(updatedUser)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Signup failed. Please try again.'
      if (message.includes('409')) {
        setError('That username already exists. Choose another one.')
      } else {
        setError('Signup failed. Please try again.')
      }
    } finally {
      setSigningUp(false)
    }
  }

  // Sync dark state → DOM + ref
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    isDarkRef.current = dark

    // Immediately repaint canvas background on theme switch
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.fillStyle = dark ? '#0a0a0a' : '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [dark])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    isDarkRef.current = localStorage.getItem('theme') !== 'light'

    const fill = () => {
      ctx.fillStyle = isDarkRef.current ? '#0a0a0a' : '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      fill()
    }
    resize()
    window.addEventListener('resize', resize)

    const branches: Branch[] = []
    for (let i = 0; i < 4; i++) spawnRoot(canvas, branches)

    const interval = setInterval(() => {
      if (branches.length < 12) spawnRoot(canvas, branches)
    }, 1800)

    let rafId: number
    function loop() {
      const bg = isDarkRef.current ? 'rgba(10,10,10,0.04)' : 'rgba(255,255,255,0.04)'
      const color = isDarkRef.current ? '#5aacdf' : '#034078'
      ctx!.fillStyle = bg
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)
      for (let i = branches.length - 1; i >= 0; i--) {
        if (branches[i].isFullyDone()) branches.splice(i, 1)
      }
      branches.forEach(b => { b.update(); b.draw(ctx!, color) })
      rafId = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      window.removeEventListener('resize', resize)
      clearInterval(interval)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* Theme toggle */}
      <button
        onClick={() => setDark(d => !d)}
        className="absolute top-4 right-4 z-10 text-xl text-[#034078] dark:text-[#5aacdf] border border-[#034078]/30 dark:border-[#5aacdf]/30 hover:border-[#034078] dark:hover:border-[#5aacdf] px-2 py-0.5 transition-colors"
        aria-label="Toggle theme"
      >
        {dark ? '☀' : '☾'}
      </button>

      <div className="relative z-10 flex flex-col items-center gap-5 text-center select-none">
        <h1 className="text-8xl md:text-9xl font-bold tracking-widest text-[#034078] dark:text-[#5aacdf]">
          BR@NCH
        </h1>
        <p className="text-xs tracking-[0.35em] uppercase text-[#034078]/40 dark:text-[#5aacdf]/40 font-mono">
          Explore the world, one br@nch at a time.
        </p>
        <div className="mt-3 w-[min(92vw,28rem)] border border-[#034078]/30 dark:border-[#5aacdf]/30 bg-white/70 dark:bg-black/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => { setMode('login'); setError(null) }}
              className={`px-3 py-1 text-xs tracking-widest uppercase border transition-colors font-mono ${
                mode === 'login'
                  ? 'text-[#034078] dark:text-[#5aacdf] border-[#034078] dark:border-[#5aacdf]'
                  : 'text-[#034078]/70 dark:text-[#5aacdf]/70 border-[#034078]/30 dark:border-[#5aacdf]/30'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null) }}
              className={`px-3 py-1 text-xs tracking-widest uppercase border transition-colors font-mono ${
                mode === 'signup'
                  ? 'text-[#034078] dark:text-[#5aacdf] border-[#034078] dark:border-[#5aacdf]'
                  : 'text-[#034078]/70 dark:text-[#5aacdf]/70 border-[#034078]/30 dark:border-[#5aacdf]/30'
              }`}
            >
              Sign up
            </button>
          </div>

          {mode === 'login' ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full text-xs tracking-widest uppercase text-[#034078] dark:text-[#5aacdf] border border-[#034078]/30 dark:border-[#5aacdf]/30 hover:border-[#034078] dark:hover:border-[#5aacdf] px-6 py-2.5 transition-colors outline-none font-mono">
                {users.length > 0 ? 'Choose Explorer' : 'No users yet'}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="z-[2000]">
                {users.map(u => (
                  <DropdownMenuItem key={u.id} onSelect={() => onUserSelect(u.id)}>
                    {u.username}
                  </DropdownMenuItem>
                ))}
                {users.length === 0 && (
                  <DropdownMenuItem disabled>
                    Create an account first
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex flex-col gap-2 text-left">
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full bg-transparent border border-[#034078]/30 dark:border-[#5aacdf]/30 px-3 py-2 text-sm text-[#034078] dark:text-[#5aacdf] outline-none"
              />
              <div className="flex gap-2">
                <input
                  value={addressQuery}
                  onChange={e => setAddressQuery(e.target.value)}
                  placeholder="Search address"
                  className="flex-1 bg-transparent border border-[#034078]/30 dark:border-[#5aacdf]/30 px-3 py-2 text-sm text-[#034078] dark:text-[#5aacdf] outline-none"
                />
                <button
                  onClick={handleAddressSearch}
                  disabled={searching || !addressQuery.trim()}
                  className="px-3 py-2 text-xs tracking-widest uppercase text-[#034078] dark:text-[#5aacdf] border border-[#034078]/30 dark:border-[#5aacdf]/30 disabled:opacity-60"
                >
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full text-left text-xs tracking-widest text-[#034078] dark:text-[#5aacdf] border border-[#034078]/30 dark:border-[#5aacdf]/30 hover:border-[#034078] dark:hover:border-[#5aacdf] px-3 py-2.5 transition-colors outline-none font-mono truncate">
                    {selectedAddress?.name ?? 'Select address'}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="z-[2000] w-[min(88vw,26rem)]">
                    {searchResults.map(result => (
                      <DropdownMenuItem
                        key={`${result.lat}-${result.lon}-${result.name}`}
                        onSelect={() => setSelectedAddress(result)}
                      >
                        {result.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <button
                onClick={handleSignup}
                disabled={signingUp || !username.trim() || !selectedAddress}
                className="mt-1 px-3 py-2 text-xs tracking-widest uppercase text-[#034078] dark:text-[#5aacdf] border border-[#034078]/30 dark:border-[#5aacdf]/30 disabled:opacity-60"
              >
                {signingUp ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-2 text-xs text-[#034078] dark:text-[#5aacdf] font-mono">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
