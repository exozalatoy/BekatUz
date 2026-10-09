import { useState } from 'react'
import { StarIcon } from './icons'
import { cn } from '../lib/utils'

export function StarRating({
  value,
  onChange,
  size = 20,
  className,
}: {
  value: number
  onChange?: (value: number) => void
  size?: number
  className?: string
}) {
  const [hover, setHover] = useState(0)
  const active = hover || value
  const interactive = Boolean(onChange)

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={cn(
            'transition',
            interactive ? 'cursor-pointer active:scale-90' : 'cursor-default',
            star <= active ? 'text-warning' : 'text-border',
          )}
          aria-label={`${star}`}
        >
          <StarIcon size={size} filled={star <= active} />
        </button>
      ))}
    </div>
  )
}
