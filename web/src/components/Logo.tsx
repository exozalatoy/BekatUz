import { BusIcon } from './icons'
import { cn } from '../lib/utils'

export function Logo({
  size = 72,
  withText = true,
  className,
}: {
  size?: number
  withText?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className="relative flex items-center justify-center rounded-[28%] bg-surface"
        style={{ width: size, height: size }}
      >
        <div
          className="absolute inset-0 rounded-[28%] opacity-90"
          style={{ background: 'linear-gradient(145deg, #2F6BFF 0%, #1c47b3 100%)' }}
        />
        <BusIcon size={size * 0.52} className="relative text-white" />
      </div>
      {withText ? (
        <span className="text-2xl font-extrabold tracking-tight text-text">
          Bekat <span className="text-accent">Uz</span>
        </span>
      ) : null}
    </div>
  )
}
