import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { SkeletonList } from '../../components/Skeleton'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/toast-context'
import {
  BellIcon,
  BusIcon,
  ChevronIcon,
  HelpIcon,
  MapIcon,
  NewsIcon,
  ProfileIcon,
  RefreshIcon,
  SearchIcon,
} from '../../components/icons'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { TASHKENT } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'
import type { NearbyItem, NotificationOut, RouteOut } from '../../lib/types'

export function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const user = useAuthStore((state) => state.user)

  const [coords, setCoords] = useState(TASHKENT)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => void 0,
      { timeout: 5000 },
    )
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const routesQuery = useQuery({
    queryKey: ['routes', debounced],
    queryFn: () => api.get<{ items: RouteOut[] }>('/routes', { search: debounced }),
    enabled: debounced.length >= 1,
  })

  const nearbyQuery = useQuery({
    queryKey: ['nearby', coords.lat.toFixed(3), coords.lng.toFixed(3)],
    queryFn: () =>
      api.get<{ items: NearbyItem[] }>('/vehicles/nearby', {
        lat: coords.lat,
        lng: coords.lng,
        limit: 10,
      }),
    refetchInterval: 15000,
  })

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ items: NotificationOut[] }>('/notifications'),
  })

  const unread = useMemo(
    () => notificationsQuery.data?.items.filter((item) => !item.is_read).length ?? 0,
    [notificationsQuery.data],
  )

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      await notificationsQuery.refetch()
      toast.show(t('common.done'), 'success')
    } catch (caught) {
      toast.show(getErrorMessage(caught, t), 'error')
    }
  }

  const name = user?.full_name?.split(' ')[0] ?? ''
  const suggestions = routesQuery.data?.items ?? []

  const tiles = [
    { label: t('home.quickMap'), icon: <MapIcon size={22} />, to: '/app/map' },
    { label: t('home.quickNews'), icon: <NewsIcon size={22} />, to: '/app/news' },
    { label: t('home.quickProfile'), icon: <ProfileIcon size={22} />, to: '/app/profile' },
    { label: t('home.quickRules'), icon: <HelpIcon size={22} />, to: '/app/help' },
  ]

  return (
    <div className="flex flex-col px-4 pb-6 pt-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/app/profile')}>
          <Avatar name={user?.full_name ?? '?'} src={user?.avatar_url} size="md" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted">{t('home.greeting', { name })}</p>
          <p className="text-base font-bold text-text">{t('common.appName')}</p>
        </div>
        <button
          type="button"
          onClick={() => setNotifOpen(true)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text"
          aria-label={t('common.notifications')}
        >
          <BellIcon size={20} />
          {unread > 0 ? (
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-bg" />
          ) : null}
        </button>
      </div>

      <div className="relative mt-5">
        <div className="flex items-center gap-2 rounded-btn border border-border bg-surface px-3.5">
          <SearchIcon size={20} className="text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('home.whereTo')}
            className="h-12 w-full bg-transparent text-[15px] text-text outline-none"
          />
        </div>
        {debounced.length >= 1 ? (
          <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-card border border-border bg-surface shadow-xl">
            {routesQuery.isPending ? (
              <p className="px-4 py-3 text-sm text-muted">{t('home.searching')}</p>
            ) : suggestions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">{t('home.noRoutes')}</p>
            ) : (
              suggestions.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setDebounced('')
                    navigate(`/app/routes/${route.id}`)
                  }}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-surface-2"
                >
                  <span
                    className="h-8 w-8 shrink-0 rounded-btn"
                    style={{ background: route.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text">
                      {route.name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {route.from_name} - {route.to_name}
                    </span>
                  </span>
                  <ChevronIcon size={18} className="text-muted" />
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <button
            key={tile.to}
            type="button"
            onClick={() => navigate(tile.to)}
            className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-4 transition active:scale-[0.98] hover:border-accent"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-accent-soft text-accent">
              {tile.icon}
            </span>
            <span className="text-sm font-semibold text-text">{tile.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-bold text-text">{t('home.nearby')}</h2>
        <button type="button" className="text-sm text-accent" onClick={() => navigate('/app/map')}>
          {t('common.seeAll')}
        </button>
      </div>

      <div className="mt-3">
        {nearbyQuery.isPending ? (
          <SkeletonList rows={3} />
        ) : nearbyQuery.isError ? (
          <EmptyState
            icon={<RefreshIcon size={26} />}
            title={t('home.nearbyError')}
            action={
              <Button size="sm" variant="secondary" onClick={() => nearbyQuery.refetch()}>
                {t('common.retry')}
              </Button>
            }
          />
        ) : (nearbyQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={<BusIcon size={26} />} title={t('home.nearbyEmpty')} />
        ) : (
          <div className="flex flex-col gap-3">
            {nearbyQuery.data?.items.map((item) => (
              <div
                key={item.vehicle.id}
                className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-white"
                    style={{ background: item.vehicle.route?.color || '#2F6BFF' }}
                  >
                    <BusIcon size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-text">
                        {item.vehicle.route?.name}
                      </span>
                      <Badge tone={item.vehicle.status === 'moving' ? 'success' : 'neutral'}>
                        {item.vehicle.status}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted">
                      {item.vehicle.route?.to_name} · {item.vehicle.plate}
                    </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-accent">
                    {t('home.eta', { min: Math.round(item.eta_min) })}
                  </p>
                  <p className="text-xs text-muted">
                    {item.distance_km.toFixed(1)} {t('common.km')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={notifOpen} onClose={() => setNotifOpen(false)} title={t('common.notifications')}>
        {(notificationsQuery.data?.items.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t('home.noNotifications')}</p>
        ) : (
          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
            {notificationsQuery.data?.items.map((item) => (
              <div key={item.id} className="rounded-btn bg-surface-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-text">{item.title}</span>
                  {!item.is_read ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
                </div>
                <p className="mt-1 text-xs text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        )}
        {unread > 0 ? (
          <Button variant="secondary" fullWidth className="mt-4" onClick={markAllRead}>
            {t('home.markAllRead')}
          </Button>
        ) : null}
      </Sheet>
    </div>
  )
}
