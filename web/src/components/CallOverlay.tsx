import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from './Avatar'
import { MicIcon, MicOffIcon, PhoneIcon, PhoneOffIcon } from './icons'
import { onUserEvent } from '../lib/userSocket'
import { registerCallEvent, useCallStore } from '../store/call'

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function CallOverlay() {
  const { t } = useTranslation()
  const status = useCallStore((state) => state.status)
  const peer = useCallStore((state) => state.peer)
  const seconds = useCallStore((state) => state.seconds)
  const muted = useCallStore((state) => state.muted)
  const remoteStream = useCallStore((state) => state.remoteStream)
  const acceptCall = useCallStore((state) => state.acceptCall)
  const declineCall = useCallStore((state) => state.declineCall)
  const endCall = useCallStore((state) => state.endCall)
  const toggleMute = useCallStore((state) => state.toggleMute)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => onUserEvent(registerCallEvent), [])

  useEffect(() => {
    const audio = audioRef.current
    if (audio && remoteStream) {
      audio.srcObject = remoteStream
      void audio.play().catch(() => void 0)
    }
  }, [remoteStream])

  if (status === 'idle') return null

  const incoming = status === 'incoming'
  const outgoing = status === 'outgoing'

  const statusLabel = incoming
    ? t('call.incoming')
    : outgoing
      ? t('call.calling')
      : t('call.inCall')

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-gradient-to-b from-surface to-background">
      <audio ref={audioRef} autoPlay playsInline />
      <div className="flex h-full flex-col items-center justify-between px-6 py-14">
        <div className="mt-10 flex flex-col items-center gap-4">
          <Avatar name={peer?.full_name ?? '?'} src={peer?.avatar_url} size="lg" />
          <div className="text-center">
            <p className="text-xl font-bold text-text">{peer?.full_name ?? '…'}</p>
            <p className="mt-1 text-sm text-muted">
              {statusLabel}
              {status === 'active' ? ` • ${formatSeconds(seconds)}` : ''}
            </p>
          </div>
        </div>

        <div className="flex w-full max-w-[360px] items-center justify-center gap-8 pb-8">
          {status === 'active' ? (
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-full bg-surface text-text ring-1 ring-border transition active:scale-95"
            >
              {muted ? <MicOffIcon size={26} /> : <MicIcon size={26} />}
              <span className="text-[10px] font-medium text-muted">
                {muted ? t('call.unmute') : t('call.mute')}
              </span>
            </button>
          ) : null}

          {incoming ? (
            <button
              type="button"
              onClick={() => void acceptCall()}
              aria-label={t('call.accept')}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-success/90 text-white shadow-lg transition active:scale-95"
            >
              <PhoneIcon size={30} />
            </button>
          ) : (
            <button
              type="button"
              onClick={incoming ? declineCall : endCall}
              aria-label={t('call.end')}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-danger text-white shadow-lg transition active:scale-95"
            >
              <PhoneOffIcon size={30} />
            </button>
          )}
        </div>

        {outgoing || incoming ? (
          <button
            type="button"
            onClick={endCall}
            className="text-sm font-medium text-muted underline underline-offset-2 transition hover:text-text"
          >
            {t('call.cancel')}
          </button>
        ) : (
          <div className="h-6" />
        )}
      </div>
    </div>
  )
}