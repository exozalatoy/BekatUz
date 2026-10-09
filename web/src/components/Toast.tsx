import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AlertIcon, CheckCircleIcon, InfoIcon } from './icons'
import { ToastContext, type ToastType } from './toast-context'
import { cn } from '../lib/utils'

type ToastItem = {
  id: number
  message: string
  type: ToastType
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3200)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircleIcon size={18} />,
    error: <AlertIcon size={18} />,
    info: <InfoIcon size={18} />,
  }

  const tones: Record<ToastType, string> = {
    success: 'border-success/40 text-success',
    error: 'border-danger/40 text-danger',
    info: 'border-accent/40 text-accent',
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-4 z-[70] flex w-full max-w-[480px] -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'animate-toast-in flex items-center gap-2.5 rounded-btn border bg-surface px-4 py-3 text-sm font-medium shadow-lg',
              tones[toast.type],
            )}
          >
            {icons[toast.type]}
            <span className="text-text">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
