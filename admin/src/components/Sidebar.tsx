import { useTranslation } from 'react-i18next'
import { NavLink, useNavigate } from 'react-router-dom'
import { cn, initials } from '../lib/utils'
import { useAuthStore } from '../store/auth'
import {
  BusIcon,
  CloseIcon,
  CreditCardIcon,
  CrownIcon,
  DriverIcon,
  HomeIcon,
  LogoutIcon,
  NewsIcon,
  SettingsIcon,
  StarIcon,
  UsersIcon,
} from './icons'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const items = [
    { to: '/app', label: t('nav.dashboard'), icon: HomeIcon, end: true },
    { to: '/app/users', label: t('nav.users'), icon: UsersIcon, end: false },
    { to: '/app/drivers', label: t('nav.drivers'), icon: DriverIcon, end: false },
    { to: '/app/vehicles', label: t('nav.vehicles'), icon: BusIcon, end: false },
    { to: '/app/news', label: t('nav.news'), icon: NewsIcon, end: false },
    { to: '/app/reviews', label: t('nav.reviews'), icon: StarIcon, end: false },
    { to: '/app/payments', label: t('nav.payments'), icon: CreditCardIcon, end: false },
    { to: '/app/premium', label: t('nav.premium'), icon: CrownIcon, end: false },
    { to: '/app/settings', label: t('nav.settings'), icon: SettingsIcon, end: false },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-navy/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-line bg-white transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              BU
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-navy">{t('app.name')}</p>
              <p className="text-[11px] text-muted">{t('app.tagline')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface lg:hidden"
            aria-label="close menu"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const IconCmp = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-muted hover:bg-surface hover:text-navy',
                  )
                }
              >
                <IconCmp width={18} height={18} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-line p-3">
          <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
              {initials(user?.full_name)}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-navy">
                {user?.full_name ?? 'Admin'}
              </p>
              <p className="truncate text-[11px] text-muted">
                {user?.email ?? user?.phone ?? ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
          >
            <LogoutIcon width={18} height={18} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>
    </>
  )
}
