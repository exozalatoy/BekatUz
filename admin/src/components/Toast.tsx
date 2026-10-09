import { useToastStore, type ToastType } from '../store/toast'
import { AlertIcon, CheckIcon, CloseIcon } from './icons'

const styles: Record<ToastType, string> = {
  success: 'border-success/30 text-success',
  error: 'border-danger/30 text-danger',
  info: 'border-primary/30 text-primary',
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg ${styles[item.type]}`}
        >
          <span className="mt-0.5">
            {item.type === 'error' ? (
              <AlertIcon width={18} height={18} />
            ) : (
              <CheckIcon width={18} height={18} />
            )}
          </span>
          <p className="flex-1 text-sm text-navy">{item.message}</p>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            className="text-muted transition-colors hover:text-navy"
            aria-label="close"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
