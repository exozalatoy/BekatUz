import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { ListItem } from '../../components/ListItem'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/toast-context'
import {
  ChevronIcon,
  CreditCardIcon,
  CrownIcon,
  HelpIcon,
  HistoryIcon,
  LogoutIcon,
  ProfileIcon,
  SettingsIcon,
  StarIcon,
} from '../../components/icons'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { useAuthStore } from '../../store/auth'
import type { User } from '../../lib/types'

export function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const logout = useAuthStore((state) => state.logout)

  const [editOpen, setEditOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')

  const saveMutation = useMutation({
    mutationFn: () => api.patch<User>('/users/me', { full_name: fullName.trim(), email: email.trim() }),
    onSuccess: (updated) => {
      setUser(updated)
      setEditOpen(false)
      toast.show(t('profile.saved'), 'success')
    },
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  const handleLogout = async () => {
    await logout()
    navigate('/auth/login', { replace: true })
  }

  return (
    <div className="flex flex-col px-4 pb-6 pt-5">
      <div className="flex flex-col items-center gap-3 py-4">
        <Avatar name={user?.full_name ?? '?'} src={user?.avatar_url} size="lg" />
        <div className="text-center">
          <h1 className="text-lg font-bold text-text">{user?.full_name}</h1>
          <p className="text-sm text-muted">{user?.phone}</p>
        </div>
        {user?.is_premium ? (
          <Badge tone="warning">
            <CrownIcon size={14} />
            {t('profile.premiumActive')}
          </Badge>
        ) : null}
      </div>

      {!user?.is_premium ? (
        <button
          type="button"
          onClick={() => navigate('/app/premium')}
          className="mb-4 flex items-center gap-3 rounded-card border border-warning/40 bg-warning/10 p-4 text-left"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-warning/20 text-warning">
            <CrownIcon size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-text">{t('premium.title')}</span>
            <span className="block text-xs text-muted">{t('premium.firstFree')}</span>
          </span>
          <ChevronIcon size={18} className="text-muted" />
        </button>
      ) : null}

      <Card className="p-1.5">
        <ListItem
          icon={<ProfileIcon size={20} />}
          title={t('profile.personalInfo')}
          onClick={() => {
            setFullName(user?.full_name ?? '')
            setEmail(user?.email ?? '')
            setEditOpen(true)
          }}
        />
        <ListItem
          icon={<HistoryIcon size={20} />}
          title={t('profile.history')}
          onClick={() => navigate('/app/history')}
        />
        <ListItem
          icon={<CreditCardIcon size={20} />}
          title={t('profile.payments')}
          onClick={() => navigate('/app/payments')}
        />
        <ListItem
          icon={<StarIcon size={20} />}
          title={t('profile.ratings')}
          onClick={() => navigate('/app/ratings')}
        />
        <ListItem
          icon={<SettingsIcon size={20} />}
          title={t('profile.settings')}
          onClick={() => navigate('/app/settings')}
        />
        <ListItem
          icon={<HelpIcon size={20} />}
          title={t('profile.help')}
          onClick={() => navigate('/app/help')}
        />
        <ListItem
          icon={<LogoutIcon size={20} />}
          title={t('common.logout')}
          danger
          onClick={() => setLogoutOpen(true)}
        />
      </Card>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title={t('profile.editProfile')}>
        <div className="flex flex-col gap-4">
          <Input
            label={t('profile.nameLabel')}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <Input
            label={t('profile.emailLabel')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="mail@example.com"
          />
          <Button fullWidth loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {t('common.save')}
          </Button>
        </div>
      </Sheet>

      <Sheet open={logoutOpen} onClose={() => setLogoutOpen(false)} title={t('common.logout')}>
        <p className="text-sm text-muted">{t('settings.logoutConfirmText')}</p>
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setLogoutOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" fullWidth onClick={handleLogout}>
            {t('common.logout')}
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
