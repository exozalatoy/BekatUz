import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PasswordInput } from '../../components/PasswordInput'
import { useToast } from '../../components/toast-context'
import { ArrowLeftIcon } from '../../components/icons'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import type { MessageResponse } from '../../lib/types'

export function Reset() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const state = location.state as { token?: string } | null
  const [token, setToken] = useState(state?.token ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!token.trim() || !password) {
      setError(t('errors.requiredField'))
      return
    }
    if (password.length < 6) {
      setError(t('errors.passwordShort'))
      return
    }
    if (password !== confirm) {
      setError(t('errors.passwordMatch'))
      return
    }
    setLoading(true)
    try {
      await api.post<MessageResponse>('/auth/reset-password', {
        token: token.trim(),
        new_password: password,
      })
      toast.show(t('auth.resetDone'), 'success')
      navigate('/auth/login', { replace: true })
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

      <h1 className="text-2xl font-bold text-text">{t('auth.resetTitle')}</h1>
      <p className="mt-2 text-sm text-muted">{t('auth.resetText')}</p>

      <div className="mt-6 flex flex-col gap-4">
        <Input
          label={t('auth.token')}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="000000"
        />
        <PasswordInput
          label={t('auth.newPassword')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />
        <PasswordInput
          label={t('auth.confirmPassword')}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
        />
        {error ? (
          <div className="rounded-btn border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </div>
        ) : null}
        <Button type="submit" fullWidth size="lg" loading={loading}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  )
}
