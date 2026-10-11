import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { ArrowLeftIcon } from '../../components/icons'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import type { MessageResponse } from '../../lib/types'

export function Forgot() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!identifier.trim()) {
      setError(t('errors.requiredField'))
      return
    }
    setLoading(true)
    try {
      const response = await api.post<MessageResponse>('/auth/forgot-password', {
        identifier: identifier.trim(),
      })
      navigate('/auth/reset', { state: { token: response.dev_token ?? '' } })
    } catch (caught) {
      setError(getErrorMessage(caught, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text"
        aria-label="back"
      >
        <ArrowLeftIcon size={20} />
      </button>

      <h1 className="text-2xl font-bold text-text">{t('auth.forgotTitle')}</h1>
      <p className="mt-2 text-sm text-muted">{t('auth.forgotText')}</p>

      <div className="mt-6 flex flex-col gap-4">
        <Input
          label={t('auth.phoneTab')}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="+998 (90) 123-45-67 / mail@example.com"
        />
        {error ? (
          <div className="rounded-btn border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </div>
        ) : null}
        <Button type="submit" fullWidth size="lg" loading={loading}>
          {t('auth.sendReset')}
        </Button>
      </div>
    </form>
  )
}
