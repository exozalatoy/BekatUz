import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ListItem } from '../../components/ListItem'
import { PasswordInput } from '../../components/PasswordInput'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/toast-context'
import {
  FingerprintIcon,
  GlobeIcon,
  LockIcon,
  LogoutIcon,
  MoonIcon,
  BellIcon,
  TrashIcon,
} from '../../components/icons'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { changeLanguage } from '../../i18n'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/app'
import { useAuthStore } from '../../store/auth'
import type { Lang, MessageResponse } from '../../lib/types'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition',
        checked ? 'bg-accent' : 'bg-border',
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          'absolute top-1 h-5 w-5 rounded-full bg-white transition-all',
          checked ? 'left-6' : 'left-1',
        )}
      />
    </button>
  )
}

const LANGUAGES: { value: Lang; label: string }[] = [
  { value: 'uz', label: "O'zbekcha" },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
]

export function Settings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const darkMode = useAppStore((state) => state.darkMode)
  const setDarkMode = useAppStore((state) => state.setDarkMode)
  const language = useAppStore((state) => state.language)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const [notifications, setNotifications] = useState(true)
  const [biometrics, setBiometrics] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const passwordMutation = useMutation({
    mutationFn: () =>
      api.put<MessageResponse>('/users/me/password', {
        old_password: oldPassword,
        new_password: newPassword,
      }),
    onSuccess: () => {
      toast.show(t('settings.passwordChanged'), 'success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwOpen(false)
    },
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  const handlePassword = (event: FormEvent) => {
    event.preventDefault()
    if (newPassword.length < 6) {
      toast.show(t('errors.passwordShort'), 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.show(t('errors.passwordMatch'), 'error')
      return
    }
    passwordMutation.mutate()
  }

  const handleLanguage = async (value: Lang) => {
    await changeLanguage(value)
    try {
      await api.patch('/users/me', { language: value })
    } catch {
      void 0
    }
  }

  const handleNotifications = (value: boolean) => {
    setNotifications(value)
    api.patch('/users/me', { notifications_enabled: value }).catch(() => void 0)
  }

  const clearData = () => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    toast.show(t('settings.clearDataDone'), 'success')
    window.setTimeout(() => window.location.reload(), 600)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/auth/login', { replace: true })
  }

  return (
    <div className="pb-8">
      <TopBar title={t('settings.title')} onBack={() => navigate('/app/profile')} />
      <div className="flex flex-col gap-4 px-4 pt-4">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-surface-2 text-accent">
              <GlobeIcon size={20} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">{t('settings.language')}</p>
              <p className="text-xs text-muted">{t('settings.languageDesc')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {LANGUAGES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => handleLanguage(item.value)}
                className={cn(
                  'flex-1 rounded-btn border px-3 py-2 text-sm font-semibold transition',
                  language === item.value
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border bg-surface-2 text-muted',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-1.5">
          <ListItem
            icon={<BellIcon size={20} />}
            title={t('settings.notifications')}
            subtitle={t('settings.notificationsDesc')}
            trailing={<Toggle checked={notifications} onChange={handleNotifications} />}
          />
          <ListItem
            icon={<MoonIcon size={20} />}
            title={t('settings.darkMode')}
            subtitle={t('settings.darkModeDesc')}
            trailing={<Toggle checked={darkMode} onChange={setDarkMode} />}
          />
        </Card>

        <div>
          <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('settings.security')}
          </p>
          <Card className="p-1.5">
            <ListItem
              icon={<LockIcon size={20} />}
              title={t('settings.changePassword')}
              onClick={() => setPwOpen((value) => !value)}
            />
            {pwOpen ? (
              <form onSubmit={handlePassword} className="flex flex-col gap-3 px-3 pb-3">
                <PasswordInput
                  label={t('settings.oldPassword')}
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                  autoComplete="current-password"
                />
                <PasswordInput
                  label={t('settings.newPassword')}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <PasswordInput
                  label={t('settings.confirmPassword')}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <Button type="submit" fullWidth loading={passwordMutation.isPending}>
                  {t('settings.changePasswordBtn')}
                </Button>
              </form>
            ) : null}
            <ListItem
              icon={<FingerprintIcon size={20} />}
              title={t('settings.biometrics')}
              subtitle={t('settings.biometricsDesc')}
              trailing={<Toggle checked={biometrics} onChange={setBiometrics} />}
            />
          </Card>
        </div>

        <div>
          <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('settings.data')}
          </p>
          <Card className="p-1.5">
            <ListItem
              icon={<TrashIcon size={20} />}
              title={t('settings.clearData')}
              subtitle={t('settings.clearDataText')}
              danger
              onClick={clearData}
            />
          </Card>
        </div>

        <Button variant="danger" fullWidth leftIcon={<LogoutIcon size={18} />} onClick={handleLogout}>
          {t('common.logout')}
        </Button>

        <p className="pb-2 text-center text-xs text-muted">
          {t('common.appName')} · {user?.phone}
        </p>
      </div>
    </div>
  )
}
