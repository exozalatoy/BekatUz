import { cn, initials } from '../lib/utils'

type Size = 'sm' | 'md' | 'lg'

const sizeMap: Record<Size, string> = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string | null
  size?: Size
  className?: string
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizeMap[size], className)}
      />
    )
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-accent-soft font-bold text-accent',
        sizeMap[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  )
}
