import { createContext, useContext } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export type ToastContextValue = {
  show: (message: string, type?: ToastType) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
