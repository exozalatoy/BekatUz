import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { OtpInput } from '../../components/OtpInput'
import { ArrowLeftIcon, SendIcon, TelegramIcon } from '../../components/icons'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatDuration, getDevHint, setDevHint } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'
import type { MessageResponse } from '../../lib/types'

export function Verify() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const verify = useAuthStore((state) => state.verify)

  const state = location.state as { phone?: string; telegramLink?: string } | null
  const phone = state?.phone ?? ''

  const [code, setCode] = useState('')
  const [seconds, setSeconds] = useState(120)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [devCode, setDevCodeState] = useState<string | null>(getDevHint())
  const [telegramLink, setTelegramLink] = useState<string | null>(state?.telegramLink ?? null)
  const submitting = useRef(false)

  useEffect(() => {
    if (!phone) navigate('/auth/role', { replace: true })
  }, [phone, navigate])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((value) => (value <= 1 ? 0 : value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const submit = async (value: string) => {
    if (submitting.current || value.length < 6) return
    submitting.current = true
    setLoading(true)
    setError('')
    try {
      await verify(phone, value)
      setDevHint(null)
    } catch (caught) {
      setError(getErrorMessage(caught, t))
      setCode('')
      submitting.current = false
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setResending(true)
    setError('')
    try {
      const response = await api.post<MessageResponse>('/auth/resend-code', { phone })
      if (response.telegram_link) setTelegramLink(response.telegram_link)
      if (response.dev_code) {
        setDevCodeState(response.dev_code)
        setDevHint(response.dev_code)
      }
      setSeconds(120)
    } catch (caught) {
      setError(getErrorMessage(caught, t))
    } finally {
      setResending(false)
    }
  }

  const openTelegram = () => {
    if (telegramLink) window.open(telegramLink, '_blank', 'noopener')
  }

  return (
    <div className="flex flex-1 flex-col">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text"
        aria-label="back"
      >
        <ArrowLeftIcon size={20} />
      </button>

      <h1 className="text-2xl font-bold text-text">{t('auth.verifyTitle')}</h1>
      <p className="mt-2 text-sm text-muted">{t('auth.verifyText', { phone })}</p>

      {telegramLink ? (
        <button
          type="button"
          onClick={openTelegram}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-btn bg-[#229ED9] px-4 py-3 text-sm font-semibold text-white"
        >
          <TelegramIcon size={20} />
          {t('auth.telegramGetCode')}
        </button>
      ) : null}

      {devCode ? (
        <div className="mt-5 rounded-btn border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-warning">
          {t('auth.devCode', { code: devCode })}
        </div>
      ) : null}

      <div className="mt-6">
        <OtpInput value={code} onChange={setCode} onComplete={submit} error={Boolean(error)} disabled={loading} />
      </div>

      {error ? (
        <p className="mt-3 text-center text-sm text-danger">{error}</p>
      ) : (
        <p className="mt-3 text-center text-sm text-muted">{formatDuration(seconds)}</p>
      )}

      <Button
        fullWidth
        size="lg"
        className="mt-6"
        loading={loading}
        disabled={code.length < 6}
        onClick={() => submit(code)}
      >
        {loading ? t('auth.verifying') : t('common.confirm')}
      </Button>

      <button
        type="button"
        disabled={seconds > 0 || resending}
        onClick={resend}
        className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-accent disabled:text-muted"
      >
        <SendIcon size={18} />
        {seconds > 0 ? t('auth.resendIn', { time: formatDuration(seconds) }) : t('auth.resend')}
      </button>
    </div>
  )
}
