import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Logo } from '../components/Logo'
import { getTokens } from '../lib/api'
import { homeRouteFor, useAuthStore } from '../store/auth'
import { useAppStore } from '../store/app'

export function Splash() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const onboardingSeen = useAppStore((state) => state.onboardingSeen)

  useEffect(() => {
    if (getTokens() && user) navigate(homeRouteFor(user), { replace: true })
  }, [navigate, user])

  return (
    <div className="shell">
      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(circle at 50% 30%, rgba(47,107,255,0.28), transparent 60%)',
          }}
        />
        <Logo size={92} withText={false} />
        <h1 className="relative text-4xl font-extrabold tracking-tight text-text">
          Bekat <span className="text-accent">Uz</span>
        </h1>
        <p className="relative max-w-xs text-center text-sm text-muted">{t('splash.tagline')}</p>
      </div>
      <div className="px-6 pb-10">
        <Button
          fullWidth
          size="lg"
          onClick={() => navigate(onboardingSeen ? '/auth/login' : '/onboarding')}
        >
          {t('common.start')}
        </Button>
      </div>
    </div>
  )
}
