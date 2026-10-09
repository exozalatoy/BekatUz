import { cn } from '../lib/utils'

export interface TabItem {
  id: string
  label: string
}

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('no-scrollbar flex gap-2 overflow-x-auto', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
            value === tab.id
              ? 'bg-accent text-white'
              : 'bg-surface-2 text-muted hover:text-text',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
