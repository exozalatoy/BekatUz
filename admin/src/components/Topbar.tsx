import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { MenuIcon } from './icons'

interface TopbarProps {
  onMenu: () => void
}

const titleKeys = [
  { path: '/app/users', key: 'nav.users' },
  { path: '/app/drivers', key: 'nav.drivers' },
  { path: '/app/vehicles', key: 'nav.vehicles' },
  { path: '/app/news', key: 'nav.news' },
  { path: '/app/reviews', key: 'nav.reviews' },
  { path: '/app/premium', key: 'nav.premium' },
  { path: '/app/settings', key: 'nav.settings' },
  { path: '/app', key: 'nav.dashboard' },
] as const

export function Topbar({ onMenu }: TopbarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const match = titleKeys.find((item) => location.pathname.startsWith(item.path))
  const title = t(match?.key ?? 'nav.dashboard')

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenu}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-navy hover:bg-surface lg:hidden"
        aria-label="open menu"
      >
        <MenuIcon width={18} height={18} />
      </button>
      <h1 className="text-lg font-semibold text-navy">{title}</h1>
      <div className="ml-auto text-xs text-muted">
        {new Date().toLocaleDateString('uz-UZ', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}
      </div>
    </header>
  )
}
