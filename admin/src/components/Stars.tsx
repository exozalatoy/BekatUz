import { cn } from '../lib/utils'
import { StarIcon } from './icons'

interface StarsProps {
  rating: number
  className?: string
}

export function Stars({ rating, className }: StarsProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <StarIcon
          key={value}
          width={14}
          height={14}
          className={cn(
            value <= Math.round(rating) ? 'text-warning' : 'text-line',
          )}
          fill={value <= Math.round(rating) ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  )
}
