import { API_BASE } from './api'

export type WSStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

type MessageHandler = (data: unknown) => void
type StatusHandler = (status: WSStatus) => void

const WS_BASE = import.meta.env.VITE_WS_BASE_URL as string | undefined

function wsUrl(path: string): string {
  const base = WS_BASE
    ? WS_BASE.replace(/\/$/, '')
    : API_BASE.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export class WSClient {
  private readonly url: string
  private socket: WebSocket | null = null
  private attempt = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private manualClose = false

  onMessage: MessageHandler | null = null
  onStatus: StatusHandler | null = null

  constructor(path: string) {
    this.url = wsUrl(path)
  }

  connect(): void {
    this.manualClose = false
    this.open()
  }

  private open(): void {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    this.onStatus?.(this.attempt === 0 ? 'connecting' : 'reconnecting')

    let socket: WebSocket
    try {
      socket = new WebSocket(this.url)
    } catch {
      this.scheduleReconnect()
      return
    }
    this.socket = socket

    socket.onopen = () => {
      this.attempt = 0
      this.onStatus?.('open')
    }
    socket.onmessage = (event) => {
      const raw = event.data
      if (typeof raw !== 'string') {
        this.onMessage?.(raw)
        return
      }
      try {
        this.onMessage?.(JSON.parse(raw))
      } catch {
        this.onMessage?.(raw)
      }
    }
    socket.onclose = () => {
      if (this.manualClose) this.onStatus?.('closed')
      else this.scheduleReconnect()
    }
    socket.onerror = () => {
      void 0
    }
  }

  private scheduleReconnect(): void {
    if (this.timer) return
    const delay = Math.min(1000 * 2 ** this.attempt, 15000) + Math.random() * 500
    this.attempt += 1
    this.onStatus?.('reconnecting')
    this.timer = setTimeout(() => {
      this.timer = null
      this.open()
    }, delay)
  }

  send(payload: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload))
  }

  close(): void {
    this.manualClose = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.socket?.close()
    this.socket = null
    this.onStatus?.('closed')
  }
}
