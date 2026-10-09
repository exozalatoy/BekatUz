import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { LockIcon, MailIcon } from '../components/icons'
import { errorMessage } from '../lib/api'
import { useAuthStore } from '../store/auth'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const hasToken = useAuthStore((state) => state.isAuthenticated)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (hasToken()) {
    return <Navigate to="/app" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!identifier.trim() || !password) {
      setError('Telefon/email va parolni kiriting')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await login(identifier.trim(), password)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-10 text-white lg:flex">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/10" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-base font-bold text-primary">
            BU
          </span>
          <span className="text-lg font-semibold">{t('app.name')}</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">{t('app.name')}</h1>
          <p className="mt-3 text-sm text-white/80">{t('app.tagline')}</p>
        </div>
        <p className="relative z-10 text-xs text-white/70">
          © {new Date().getFullYear()} Bekat Uz
        </p>
      </div>

      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
              BU
            </span>
            <span className="text-base font-semibold text-navy">
              {t('app.name')}
            </span>
          </div>

          <h2 className="text-2xl font-semibold text-navy">{t('auth.title')}</h2>
          <p className="mt-1 text-sm text-muted">{t('auth.subtitle')}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label={t('auth.identifier')}
              placeholder={t('auth.identifierPlaceholder')}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              leftIcon={<MailIcon width={18} height={18} />}
              autoComplete="username"
            />
            <Input
              label={t('auth.password')}
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              leftIcon={<LockIcon width={18} height={18} />}
              autoComplete="current-password"
            />

            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading} size="lg">
              {loading ? t('auth.submitting') : t('auth.submit')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
