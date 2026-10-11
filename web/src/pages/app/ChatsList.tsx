import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { Spinner } from '../../components/Spinner'
import { TopBar } from '../../components/TopBar'
import { ChatIcon } from '../../components/icons'
import { api } from '../../lib/api'
import { onUserEvent } from '../../lib/userSocket'
import type { ChatConversation, ChatMessageOut, Lang } from '../../lib/types'
import { timeAgo } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'

function lastMessagePreview(message: ChatMessageOut | null, t: (key: string) => string): string {
  if (!message) return ''
  if (message.type === 'image') return `📷 ${t('chat.photo')}`
  if (message.type === 'voice') return `🎤 ${t('chat.voice')}`
  return message.payload
}

export function ChatsList() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ items: ChatConversation[] }>('/chats/conversations')
      setConversations(data.items ?? [])
    } catch {
      void 0
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const unsubscribe = onUserEvent((event) => {
      if (event.type === 'chat:message') void load()
    })
    const timer = window.setInterval(load, 20000)
    return () => {
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [load])

  const sorted = [...conversations].sort((a, b) => {
    const aTime = a.last_message?.id ?? 0
    const bTime = b.last_message?.id ?? 0
    return bTime - aTime
  })

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t('chat.title')} showBack={false} />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size={28} />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-muted">
            <ChatIcon size={40} />
            <p className="text-sm">{t('chat.noChats')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((conversation) => {
              const mine = conversation.last_message?.sender_id === user?.id
              const preview = lastMessagePreview(conversation.last_message, t)
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => navigate(`/app/chat/${conversation.id}`)}
                  className="flex items-center gap-3 rounded-btn border border-border bg-surface p-3 text-left transition active:scale-[0.99]"
                >
                  <Avatar
                    name={conversation.peer.full_name}
                    src={conversation.peer.avatar_url}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-text">
                        {conversation.peer.full_name}
                      </p>
                      {conversation.last_message ? (
                        <span className="shrink-0 text-[11px] text-muted">
                          {timeAgo(conversation.last_message.created_at, i18n.language as Lang)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted">
                        {mine ? `${t('chat.you')}: ` : ''}
                        {preview}
                      </p>
                      {conversation.unread > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                          {conversation.unread}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}