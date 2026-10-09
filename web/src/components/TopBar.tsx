import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from './icons'

export function TopBar({
  title,
  subtitle,
  onBack,
  right,
  showBack = true,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
  showBack?: boolean
}) {
  const navigate = useNavigate()
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur-md">
      {showBack ? (
        <button
          type="button"
          onClick={onBack ?? (() => navigate(-1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text transition active:scale-95"
          aria-label="back"
        >
          <ArrowLeftIcon size={20} />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold text-text">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  )
}
