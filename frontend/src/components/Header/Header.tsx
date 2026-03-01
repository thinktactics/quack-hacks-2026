import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { type User } from '@/api/user'

interface Props {
  username: string
  userId: number
  users: User[]
  onUserSwitch: (id: number) => void
}

export function Header({ username, userId, users, onUserSwitch }: Props) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') !== 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
      <span className="text-xl font-bold tracking-widest text-[#034078] dark:text-[#5aacdf]">BR@NCH</span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setDark(d => !d)}
          className="text-xl text-muted-foreground hover:text-foreground transition-colors border border-border/40 hover:border-border px-2 py-0.5"
          aria-label="Toggle theme"
        >
          {dark ? '☀' : '☾'}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors outline-none border border-border/40 hover:border-border px-2 py-0.5">
            {username}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[2000]">
            <DropdownMenuLabel>Switch user</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {users.map(u => (
              <DropdownMenuItem
                key={u.id}
                onSelect={() => onUserSwitch(u.id)}
                className={u.id === userId ? 'font-semibold text-[#034078]' : ''}
              >
                {u.username}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
