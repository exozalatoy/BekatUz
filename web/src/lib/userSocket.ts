import { WSClient } from './ws'

type UserEvent = { type: string; data?: unknown; conversation_id?: number }

let client: WSClient | null = null
let clientToken: string | null = null
const handlers = new Set<(event: UserEvent) => void>()

function makeClient(token: string): WSClient {
  const next = new WSClient(`/ws/user?token=${encodeURIComponent(token)}`)
  next.onMessage = (raw) => {
    const event = raw as UserEvent
    if (!event || typeof event !== 'object' || !event.type) return
    handlers.forEach((handler) => handler(event))
  }
  next.connect()
  return next
}

export function connectUserSocket(token: string): void {
  if (client && clientToken === token) return
  if (client) client.close()
  clientToken = token
  client = makeClient(token)
}

export function disconnectUserSocket(): void {
  if (client) {
    client.close()
    client = null
  }
  clientToken = null
}

export function onUserEvent(handler: (event: UserEvent) => void): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export function sendUserEvent(payload: unknown): void {
  client?.send(payload)
}