import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Logo } from '../../components/Logo'
import { PasswordInput } from '../../components/PasswordInput'
import { Segmented } from '../../components/Segmented'
import { useToast } from '../../components/toast-context'
import { AppleIcon, GoogleIcon, MailIcon, PhoneIcon, TelegramIcon } from '../../components/icons'
import { formatPhone, isPhoneComplete, toApiPhone } from '../../lib/utils'
import { getErrorMessage } from '../../lib/errors'
import { homeRouteFor, useAuthStore } from '../../store/auth'

type Tab = 'phone' | 'email'

export function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const login = useAuthStore((state) => state.login)

  const [tab, setTab] = useState<Tab>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const identifier = tab === 'phone' ? toApiPhone(phone) : email.trim()
    if (tab === 'phone' && !isPhoneComplete(phone)) {
      setError(t('errors.phoneInvalid'))
      return
    }
    if (!identifier || !password) {
      setError(t('errors.requiredField'))
      return
    }
    setLoading(true)
    try {
      const user = await login(identifier, password, remember)
      toast.show(t('auth.loginSuccess'), 'success')
      if (user.role === 'admin') navigate('/blocked', { replace: true })
      else navigate(homeRouteFor(user), { replace: true })
    } catch (caught) {
      setError(getErrorMessage(caught, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <div className="flex flex-col items-center gap-3 pb-6 pt-4">
        <Logo size={60} withText={false} />
        <h1 className="text-2xl font-bold text-text">{t('auth.signIn')}</h1>
        <p className="text-sm text-muted">{t('splash.tagline')}</p>
      </div>

      <Segmented<Tab>
        options={[
          { value: 'phone', label: t('auth.phoneTab') },
          { value: 'email', label: t('auth.emailTab') },
        ]}
        value={tab}
        onChange={(value) => {
          setTab(value)
          setError('')
        }}
      />

      <div className="mt-4 flex flex-col gap-4">
        {tab === 'phone' ? (
          <Input
            label={t('auth.phoneLabel')}
            value={phone}
            onChange={(event) => setPhone(formatPhone(event.target.value))}
            inputMode="tel"
            placeholder="+998 (90) 123-45-67"
            leftIcon={<PhoneIcon size={20} />}
            autoComplete="tel"
          />
        ) : (
          <Input
            label={t('auth.emailLabel')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="mail@example.com"
            leftIcon={<MailIcon size={20} />}
            autoComplete="email"
          />
        )}

        <PasswordInput
          label={t('auth.password')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('auth.passwordPlaceholder')}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 accent-[#2F6BFF]"
            />
            {t('auth.remember')}
          </label>
          <button
            type="button"
            onClick={() => navigate('/auth/forgot')}
            className="text-sm font-medium text-accent"
          >
            {t('auth.forgot')}
          </button>
        </div>

        {error ? (
          <div className="rounded-btn border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          {t('auth.signIn')}
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        {t('auth.orContinue')}
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => toast.show(t('common.comingSoon'), 'info')}
          className="flex h-12 items-center justify-center rounded-btn bg-[#229ED9] text-white transition active:scale-95"
          aria-label="Telegram"
        >
          <TelegramIcon size={22} />
        </button>
        <button
          type="button"
          disabled
          title={t('common.comingSoon')}
          className="flex h-12 items-center justify-center rounded-btn border border-border bg-surface-2 text-text opacity-50"
          aria-label="Google"
        >
          <GoogleIcon size={22} />
        </button>
        <button
          type="button"
          disabled
          title={t('common.comingSoon')}
          className="flex h-12 items-center justify-center rounded-btn border border-border bg-surface-2 text-text opacity-50"
          aria-label="Apple"
        >
          <AppleIcon size={22} />
        </button>
      </div>

      <p className="mt-auto pt-8 text-center text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <button
          type="button"
          onClick={() => navigate('/auth/role')}
          className="font-semibold text-accent"
        >
          {t('auth.createAccount')}
        </button>
      </p>
    </form>
  )
}
