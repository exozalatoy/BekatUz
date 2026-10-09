import { cn } from '../lib/utils'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex rounded-full bg-surface-2 p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 rounded-full px-3 py-2 text-sm font-semibold transition',
            value === option.value ? 'bg-accent text-white shadow' : 'text-muted hover:text-text',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
