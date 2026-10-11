import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar } from '../../components/TopBar'
import { ImageIcon, MicIcon, PhoneIcon, SendIcon } from '../../components/icons'
import { api } from '../../lib/api'
import { fileToCompressedDataUrl } from '../../lib/image'
import { onUserEvent } from '../../lib/userSocket'
import type { ChatConversation, ChatMessageOut, ChatMessageUserEvent } from '../../lib/types'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'
import { useCallStore } from '../../store/call'

function formatTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function recordingToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(blob)
  })
}

export function ConversationChat() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const conversationId = Number(id)
  const user = useAuthStore((state) => state.user)
  const startCall = useCallStore((state) => state.startCall)

  const [conversation, setConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessageOut[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingMs, setRecordingMs] = useState(0)
  const seenRef = useRef<Set<number>>(new Set())
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const appendMessages = useCallback((items: ChatMessageOut[]) => {
    setMessages((previous) => {
      const next = [...previous]
      for (const item of items) {
        if (!seenRef.current.has(item.id)) {
          seenRef.current.add(item.id)
          next.push(item)
        }
      }
      next.sort((a, b) => a.id - b.id)
      return next
    })
  }, [])

  useEffect(() => {
    if (!Number.isFinite(conversationId) || conversationId <= 0) {
      navigate('/app/chats', { replace: true })
      return
    }
    let active = true
    api
      .get<ChatConversation>(`/chats/${conversationId}`)
      .then((conversation) => {
        if (!active) return
        setConversation(conversation)
        void api.post(`/chats/${conversationId}/read`)
      })
      .catch(() => active && navigate('/app/chats', { replace: true }))
    api
      .get<{ items: ChatMessageOut[] }>(`/chats/${conversationId}/messages?limit=100`)
      .then((data) => {
        if (active) appendMessages(data.items ?? [])
      })
      .catch(() => void 0)
    return () => {
      active = false
    }
  }, [conversationId, navigate, appendMessages])

  useEffect(() => {
    void api.post(`/chats/${conversationId}/read`).catch(() => void 0)
    return onUserEvent((event) => {
      if (event.type !== 'chat:message') return
      const message = event as ChatMessageUserEvent
      if (message.conversation_id !== conversationId) return
      appendMessages([message.data])
      void api.post(`/chats/${conversationId}/read`).catch(() => void 0)
    })
  }, [conversationId, appendMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendText = useCallback(async () => {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    try {
      const message = await api.post<ChatMessageOut>(`/chats/${conversationId}/messages`, {
        type: 'text',
        payload: value,
      })
      appendMessages([message])
      setText('')
    } catch {
      void 0
    } finally {
      setSending(false)
    }
  }, [text, sending, conversationId, appendMessages])

  const sendImage = useCallback(
    async (file: File) => {
      setSending(true)
      try {
        const payload = await fileToCompressedDataUrl(file)
        const message = await api.post<ChatMessageOut>(`/chats/${conversationId}/messages`, {
          type: 'image',
          payload,
        })
        appendMessages([message])
      } catch {
        void 0
      } finally {
        setSending(false)
      }
    },
    [conversationId, appendMessages],
  )

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
    })
    recorder.stop()
    await stopped
    recorderRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setRecording(false)
    setRecordingMs(0)
    if (chunksRef.current.length === 0) return
    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
    chunksRef.current = []
    setSending(true)
    try {
      const payload = await recordingToDataUrl(blob)
      const message = await api.post<ChatMessageOut>(`/chats/${conversationId}/messages`, {
        type: 'voice',
        payload,
      })
      appendMessages([message])
    } catch {
      void 0
    } finally {
      setSending(false)
    }
  }, [conversationId, appendMessages])

  const startRecording = useCallback(async () => {
    if (recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
      }
      recorder.start()
      setRecording(true)
      setRecordingMs(0)
      timerRef.current = setInterval(() => setRecordingMs((value) => value + 1), 1000)
    } catch {
      void 0
    }
  }, [recording])

  const peer = conversation?.peer ?? null
  const stop = recording ? stopRecording : startRecording

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={peer?.full_name ?? t('chat.title')}
        subtitle={peer?.online ? t('chat.online') : t('chat.offline')}
        onBack={() => navigate(-1)}
        right={
          peer ? (
            <button
              type="button"
              aria-label={t('call.title')}
              onClick={() => void startCall(peer)}
              className="flex h-10 w-10 items-center justify-center rounded-btn bg-accent-soft text-accent transition active:scale-95"
            >
              <PhoneIcon size={20} />
            </button>
          ) : null
        }
      />

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{t('chat.empty')}</p>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === user?.id
            return (
              <div
                key={message.id}
                className={cn(
                  'flex max-w-[84%] flex-col',
                  mine ? 'self-end items-end' : 'self-start items-start',
                )}
              >
                <div
                  className={cn(
                    'break-words rounded-2xl px-3.5 py-2 text-sm',
                    mine ? 'bg-accent text-white' : 'bg-surface-2 text-text',
                  )}
                >
                  {message.type === 'text' ? (
                    message.payload
                  ) : message.type === 'image' ? (
                    <img
                      src={message.payload}
                      alt={t('chat.photo')}
                      className="max-h-64 w-full max-w-[280px] rounded-xl object-cover"
                    />
                  ) : (
                    <audio controls preload="metadata" className="h-11 w-56" src={message.payload} />
                  )}
                  <p
                    className={cn(
                      'mt-1 text-right text-[10px] leading-none',
                      mine ? 'text-white/70' : 'text-muted',
                    )}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-surface px-3 py-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void sendImage(file)
            event.target.value = ''
          }}
        />
        <button
          type="button"
          aria-label={t('chat.photo')}
          onClick={() => fileRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-surface-2 text-accent"
        >
          <ImageIcon size={20} />
        </button>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void sendText()
          }}
          placeholder={t('chat.placeholder')}
          className="h-11 min-w-0 flex-1 rounded-btn border border-border bg-surface-2 px-3.5 text-sm text-text outline-none"
        />
        <button
          type="button"
          aria-label={recording ? t('call.stopRecording') : t('call.record')}
          onClick={() => void stop()}
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-btn transition active:scale-95',
            recording ? 'bg-danger text-white' : 'bg-surface-2 text-accent',
          )}
        >
          <span className="flex items-baseline gap-1 text-xs font-bold">
            {recording ? (
              <>
                {recordingMs > 0 ? `${recordingMs}s` : '●'}
                <MicIcon size={16} />
              </>
            ) : (
              <MicIcon size={20} />
            )}
          </span>
        </button>
        <button
          type="button"
          aria-label={t('chat.send')}
          onClick={() => void sendText()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-accent text-white transition active:scale-95"
        >
          <SendIcon size={20} />
        </button>
      </div>
    </div>
  )
}