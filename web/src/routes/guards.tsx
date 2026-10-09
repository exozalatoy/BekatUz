import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { getTokens } from '../lib/api'
import { homeRouteFor, useAuthStore } from '../store/auth'

export function RequireAuth({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user)
  if (!getTokens() || !user) return <Navigate to="/auth/login" replace />
  if (user.role === 'admin') return <Navigate to="/blocked" replace />
  return <>{children}</>
}

export function RequireGuest({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user)
  if (getTokens() && user) return <Navigate to={homeRouteFor(user)} replace />
  return <>{children}</>
}
