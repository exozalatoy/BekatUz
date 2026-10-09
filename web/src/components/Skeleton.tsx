import { cn } from '../lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-card', className)} />
}

export function SkeletonList({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  )
}
