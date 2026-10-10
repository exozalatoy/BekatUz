import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PasswordInput } from '../../components/PasswordInput'
import { ArrowLeftIcon, PhoneIcon } from '../../components/icons'
import { cn, formatPhone, isPhoneComplete, passwordStrength, setDevHint, toApiPhone } from '../../lib/utils'
import { getErrorMessage } from '../../lib/errors'
import { VEHICLE_CATEGORIES } from '../../lib/types'
import { useAuthStore } from '../../store/auth'

export function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const register = useAuthStore((state) => state.register)

  const role = searchParams.get('role') === 'driver' ? 'driver' : 'passenger'
  const isDriver = role === 'driver'

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [category, setCategory] = useState<string>(VEHICLE_CATEGORIES[0])
  const [telegram, setTelegram] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = useMemo(() => passwordStrength(password), [password])
  const mismatch = confirm.length > 0 && confirm !== password

  const strengthTones = ['bg-border', 'bg-danger', 'bg-warning', 'bg-accent', 'bg-success']
  const strengthLabel = {
    weak: t('auth.strengthWeak'),
    fair: t('auth.strengthFair'),
    good: t('auth.strengthGood'),
    strong: t('auth.strengthStrong'),
  } as Record<string, string>

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!fullName.trim() || !phone || !password || !confirm) {
      setError(t('errors.requiredField'))
      return
    }
    if (!isPhoneComplete(phone)) {
      setError(t('errors.phoneInvalid'))
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
      const apiPhone = toApiPhone(phone)
      const response = await register({
        full_name: fullName.trim(),
        phone: apiPhone,
        password,
        password_confirm: confirm,
        role,
        ...(isDriver ? { vehicle_category: category } : {}),
        ...(isDriver && telegram.trim() ? { telegram_id: telegram.trim() } : {}),
      })
      setDevHint(response.dev_code ?? null)
      navigate('/auth/verify', {
        state: { phone: response.phone || apiPhone, telegramLink: response.telegram_link },
      })
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

      <h1 className="text-2xl font-bold text-text">{t('auth.registerTitle')}</h1>
      <p className="mt-2 text-sm text-muted">
        {isDriver ? t('auth.registerDriverText') : t('auth.registerPassengerText')}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <Input
          label={t('auth.fullName')}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder={t('auth.fullNamePlaceholder')}
          autoComplete="name"
        />
        <Input
          label={t('auth.phoneLabel')}
          value={phone}
          onChange={(event) => setPhone(formatPhone(event.target.value))}
          inputMode="tel"
          placeholder="+998 (90) 123-45-67"
          leftIcon={<PhoneIcon size={20} />}
          autoComplete="tel"
        />
        <div>
          <PasswordInput
            label={t('auth.password')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
            autoComplete="new-password"
          />
          {password ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={cn(
                      'h-1.5 flex-1 rounded-full',
                      step <= strength.score ? strengthTones[strength.score] : 'bg-border',
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-muted">{strengthLabel[strength.label] ?? ''}</span>
            </div>
          ) : null}
        </div>
        <PasswordInput
          label={t('auth.confirmPassword')}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder={t('auth.confirmPassword')}
          autoComplete="new-password"
          error={mismatch ? t('auth.passwordMismatch') : undefined}
        />

        {isDriver ? (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-muted">
                {t('auth.vehicleCategory')}
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-12 w-full rounded-btn border border-border bg-surface-2 px-3.5 text-[15px] text-text outline-none focus:border-accent"
              >
                {VEHICLE_CATEGORIES.map((value) => (
                  <option key={value} value={value} className="bg-surface text-text">
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label={`${t('auth.telegramHandle')} (${t('common.optional')})`}
              value={telegram}
              onChange={(event) => setTelegram(event.target.value)}
              placeholder={t('auth.telegramHandlePlaceholder')}
            />
          </>
        ) : null}

        {error ? (
          <div className="rounded-btn border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          {t('auth.createAccount')}
        </Button>
      </div>

      <p className="mt-auto pt-8 text-center text-sm text-muted">
        {t('auth.alreadyHave')}{' '}
        <button
          type="button"
          onClick={() => navigate('/auth/login')}
          className="font-semibold text-accent"
        >
          {t('auth.signIn')}
        </button>
      </p>
    </form>
  )
}
