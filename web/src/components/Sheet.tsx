import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { CloseIcon } from './icons'

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="close"
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
      />
      <div className="animate-sheet-up relative w-full max-w-[480px] rounded-t-[24px] border border-border bg-surface p-5 pb-8">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-muted transition hover:text-text"
            aria-label="close"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
