import type { ReactNode } from 'react'
import { ChevronIcon } from './icons'
import { cn } from '../lib/utils'

export function ListItem({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  className,
  danger = false,
}: {
  icon?: ReactNode
  title: string
  subtitle?: string
  trailing?: ReactNode
  onClick?: () => void
  className?: string
  danger?: boolean
}) {
  const content = (
    <>
      {icon ? (
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-btn',
            danger ? 'bg-danger/12 text-danger' : 'bg-surface-2 text-accent',
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-left">
        <span className={cn('block truncate text-sm font-semibold', danger ? 'text-danger' : 'text-text')}>
          {title}
        </span>
        {subtitle ? <span className="block truncate text-xs text-muted">{subtitle}</span> : null}
      </span>
      {trailing ?? (onClick ? <ChevronIcon size={18} className="text-muted" /> : null)}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-btn px-3 py-3 transition hover:bg-surface-2 active:scale-[0.99]',
          className,
        )}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={cn('flex w-full items-center gap-3 rounded-btn px-3 py-3', className)}>
      {content}
    </div>
  )
}
