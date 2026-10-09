import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  const tones: Record<Tone, string> = {
    accent: 'bg-accent-soft text-accent',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-danger/15 text-danger',
    neutral: 'bg-surface-2 text-muted',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
