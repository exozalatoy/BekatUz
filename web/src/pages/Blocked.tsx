import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { AlertIcon } from '../components/icons'
import { useAuthStore } from '../store/auth'

export function Blocked() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = async () => {
    await logout()
    navigate('/auth/login', { replace: true })
  }

  return (
    <div className="shell">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-danger/15 text-danger">
          <AlertIcon size={40} />
        </div>
        <h1 className="text-xl font-bold text-text">{t('auth.blockedTitle')}</h1>
        <p className="text-sm text-muted">{t('auth.blockedText')}</p>
      </div>
      <div className="px-6 pb-10">
        <Button fullWidth variant="secondary" onClick={handleLogout}>
          {t('common.logout')}
        </Button>
      </div>
    </div>
  )
}
