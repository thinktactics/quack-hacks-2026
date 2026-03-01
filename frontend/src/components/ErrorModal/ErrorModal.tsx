interface Props {
  message: string
  onReload: () => void
}

export function ErrorModal({ message, onReload }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[3000] bg-black/60" />

      {/* Modal */}
      <div className="fixed inset-0 z-[3001] flex items-center justify-center p-6">
        <div className="bg-card border border-border shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
          <button
            className="w-full bg-[#034078] hover:bg-[#0a5599] active:bg-[#022d56] text-white font-bold py-3 text-base transition-colors"
            onClick={onReload}
          >
            Reload
          </button>
        </div>
      </div>
    </>
  )
}
