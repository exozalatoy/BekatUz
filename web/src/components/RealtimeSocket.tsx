import { useEffect } from 'react'
import { connectUserSocket, disconnectUserSocket } from '../lib/userSocket'
import { useAuthStore } from '../store/auth'

export function RealtimeSocket() {
  const accessToken = useAuthStore((state) => state.accessToken)

  useEffect(() => {
    if (!accessToken) return
    connectUserSocket(accessToken)
    return () => disconnectUserSocket()
  }, [accessToken])

  return null
}