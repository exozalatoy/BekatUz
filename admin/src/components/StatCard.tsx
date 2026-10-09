import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  icon: ReactNode
  accent?: 'primary' | 'success' | 'warning' | 'danger'
  hint?: string
}

const accents: Record<string, string> = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

export function StatCard({
  label,
  value,
  icon,
  accent = 'primary',
  hint,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-navy">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
            accents[accent],
          )}
        >
          {icon}
        </span>
      </div>
    </div>
  )
}
