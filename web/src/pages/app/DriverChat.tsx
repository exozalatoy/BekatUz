import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar } from '../../components/TopBar'
import { SendIcon } from '../../components/icons'
import { WSClient, type WSStatus } from '../../lib/ws'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'
import type { ChatMessage, ChatMessageEvent } from '../../lib/types'

export function DriverChat() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)

  const room = `trip-${id}`
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [status, setStatus] = useState<WSStatus>('connecting')
  const clientRef = useRef<WSClient | null>(null)
  const sentRef = useRef<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!accessToken) return
    const client = new WSClient(
      `/ws/chat?token=${encodeURIComponent(accessToken)}&room=${encodeURIComponent(room)}`,
    )
    client.onStatus = (next) => setStatus(next)
    client.onMessage = (raw) => {
      const message = raw as Partial<ChatMessageEvent> | null
      if (message?.type !== 'message' || !message.data) return
      const data = message.data
      if (data.from === user?.full_name && sentRef.current.has(data.text)) {
        sentRef.current.delete(data.text)
        return
      }
      setMessages((previous) =>
        previous.some((item) => item.id === data.id) ? previous : [...previous, data],
      )
    }
    clientRef.current = client
    client.connect()
    return () => {
      client.close()
      clientRef.current = null
    }
  }, [accessToken, room, user?.full_name])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    const value = text.trim()
    if (!value) return
    sentRef.current.add(value)
    setMessages((previous) => [
      ...previous,
      {
        id: `local-${Date.now()}`,
        from: user?.full_name ?? t('chat.you'),
        text: value,
        created_at: new Date().toISOString(),
      },
    ])
    clientRef.current?.send({ type: 'message', data: { text: value } })
    setText('')
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={t('chat.title')}
        subtitle={status === 'open' ? t('driver.connected') : t('driver.connecting')}
        onBack={() => navigate(-1)}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{t('chat.empty')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((message) => {
              const mine = message.from === user?.full_name
              return (
                <div
                  key={message.id}
                  className={cn('flex max-w-[80%] flex-col', mine ? 'self-end items-end' : 'self-start items-start')}
                >
                  <div
                    className={cn(
                      'rounded-2xl px-3.5 py-2 text-sm',
                      mine ? 'bg-accent text-white' : 'bg-surface-2 text-text',
                    )}
                  >
                    {!mine ? (
                      <p className="mb-0.5 text-[11px] font-semibold text-accent">{message.from}</p>
                    ) : null}
                    {message.text}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-surface px-3 py-3">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') send()
          }}
          placeholder={t('chat.placeholder')}
          className="h-11 flex-1 rounded-btn border border-border bg-surface-2 px-3.5 text-sm text-text outline-none"
        />
        <button
          type="button"
          aria-label={t('chat.send')}
          onClick={send}
          className="flex h-11 w-11 items-center justify-center rounded-btn bg-accent text-white"
        >
          <SendIcon size={20} />
        </button>
      </div>
    </div>
  )
}
