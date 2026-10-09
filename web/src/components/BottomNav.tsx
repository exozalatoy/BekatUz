import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HomeIcon, MapIcon, NewsIcon, ProfileIcon } from './icons'
import { cn } from '../lib/utils'
import type { IconProps } from './icons'

type NavItem = {
  to: string
  label: string
  icon: (props: IconProps) => React.JSX.Element
  end?: boolean
}

export function BottomNav() {
  const { t } = useTranslation()
  const items: NavItem[] = [
    { to: '/app', label: t('nav.home'), icon: HomeIcon, end: true },
    { to: '/app/map', label: t('nav.map'), icon: MapIcon },
    { to: '/app/news', label: t('nav.news'), icon: NewsIcon },
    { to: '/app/profile', label: t('nav.profile'), icon: ProfileIcon },
  ]

  return (
    <nav className="safe-bottom z-30 shrink-0 border-t border-border bg-surface/95 backdrop-blur-md">
      <div className="flex items-stretch">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 transition',
                  isActive ? 'text-accent' : 'text-muted',
                )
              }
            >
              <Icon size={22} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
