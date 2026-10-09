import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, CarIcon, ChevronIcon, UsersIcon } from '../../components/icons'
import type { ReactNode } from 'react'

type RoleCard = {
  role: 'passenger' | 'driver'
  title: string
  description: string
  icon: ReactNode
  tone: string
}

export function RoleSelect() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const cards: RoleCard[] = [
    {
      role: 'passenger',
      title: t('auth.passenger'),
      description: t('auth.passengerDesc'),
      icon: <UsersIcon size={30} />,
      tone: 'bg-accent-soft text-accent',
    },
    {
      role: 'driver',
      title: t('auth.driver'),
      description: t('auth.driverDesc'),
      icon: <CarIcon size={30} />,
      tone: 'bg-success/15 text-success',
    },
  ]

  return (
    <div className="flex flex-1 flex-col">
      <button
        type="button"
        onClick={() => navigate('/auth/login')}
        className="mb-6 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text"
        aria-label="back"
      >
        <ArrowLeftIcon size={20} />
      </button>

      <h1 className="text-2xl font-bold text-text">{t('auth.selectRole')}</h1>
      <p className="mt-2 text-sm text-muted">{t('auth.selectRoleText')}</p>

      <div className="mt-8 flex flex-col gap-4">
        {cards.map((card) => (
          <button
            key={card.role}
            type="button"
            onClick={() => navigate(`/auth/register?role=${card.role}`)}
            className="flex items-center gap-4 rounded-card border border-border bg-surface p-5 text-left transition active:scale-[0.99] hover:border-accent"
          >
            <span className={`flex h-14 w-14 items-center justify-center rounded-card ${card.tone}`}>
              {card.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold text-text">{card.title}</span>
              <span className="mt-0.5 block text-sm text-muted">{card.description}</span>
            </span>
            <ChevronIcon size={20} className="text-muted" />
          </button>
        ))}
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
    </div>
  )
}
