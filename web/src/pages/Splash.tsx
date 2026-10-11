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
        <style>{`
          @keyframes bekat-splash-pop {
            0% { transform: scale(0) rotate(-18deg); opacity: 0; }
            70% { transform: scale(1.12) rotate(4deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes bekat-splash-rise {
            0% { transform: translateY(18px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes bekat-splash-glow {
            0%, 100% { opacity: 0.35; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.08); }
          }
          .bekat-splash-pop { animation: bekat-splash-pop 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
          .bekat-splash-rise { animation: bekat-splash-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
          .bekat-splash-glow { animation: bekat-splash-glow 2.6s ease-in-out infinite; }
        `}</style>
        <div
          className="bekat-splash-glow pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 30%, rgba(47,107,255,0.28), transparent 60%)',
          }}
        />
        <div className="bekat-splash-pop">
          <Logo size={92} withText={false} />
        </div>
        <h1 className="bekat-splash-rise relative text-4xl font-extrabold tracking-tight text-text">
          Bekat <span className="text-accent">Uz</span>
        </h1>
        <p
          className="bekat-splash-rise relative max-w-xs text-center text-sm text-muted"
          style={{ animationDelay: '0.15s' }}
        >
          {t('splash.tagline')}
        </p>
      </div>
      <div className="bekat-splash-rise px-6 pb-10" style={{ animationDelay: '0.25s' }}>
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
