interface Props {
  username: string
}

export function Header({ username }: Props) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
      <span className="text-xl font-bold tracking-widest text-amber-400">BR@NCH</span>
      <span className="text-sm text-muted-foreground">{username}</span>
    </header>
  )
}
