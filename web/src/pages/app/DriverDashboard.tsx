import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { ListItem } from '../../components/ListItem'
import { SkeletonList } from '../../components/Skeleton'
import { useToast } from '../../components/toast-context'
import {
  BusIcon,
  CarIcon,
  ChatIcon,
  CreditCardIcon,
  CrownIcon,
  LogoutIcon,
  MapIcon,
  RefreshIcon,
  StarIcon,
} from '../../components/icons'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatDateTime, formatSom } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'
import type { DriverMe, Lang } from '../../lib/types'

const STATUS_TONES: Record<string, 'success' | 'accent' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'warning',
  accepted: 'accent',
  in_progress: 'accent',
  completed: 'success',
  declined: 'danger',
}

const STATUS_KEYS: Record<string, string> = {
  pending: 'driver.statusPending',
  accepted: 'driver.statusAccepted',
  in_progress: 'driver.statusInProgress',
  completed: 'driver.statusCompleted',
  declined: 'driver.statusDeclined',
}

export function DriverDashboard() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const lang = i18n.language as Lang

  const query = useQuery({
    queryKey: ['driver-me'],
    queryFn: () => api.get<DriverMe>('/drivers/me'),
  })

  const toggleMutation = useMutation({
    mutationFn: (online: boolean) => api.patch('/drivers/me', { online }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-me'] }),
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  const finishWorkMutation = useMutation({
    mutationFn: () => api.post('/drivers/me/finish-work'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-me'] }),
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  const driver = query.data
  const orders = driver?.today_orders ?? []
  const earnings = orders.reduce((sum, order) => sum + order.price_som, 0)
  const pendingCount = orders.filter((order) => order.status === 'pending').length

  return (
    <div className="flex flex-col px-4 pb-6 pt-5">
      <div className="flex items-center gap-3">
        <Avatar name={user?.full_name ?? '?'} src={user?.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-text">
            {driver?.full_name ?? user?.full_name}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {driver ? (
              <>
                <StarIcon size={13} filled className="text-warning" />
                <span className="text-xs font-semibold text-text">{driver.rating.toFixed(1)}</span>
              </>
            ) : null}
            {driver?.is_premium ? (
              <Badge tone="warning">
                <CrownIcon size={12} />
                {t('driver.premiumBadge')}
              </Badge>
            ) : null}
          </div>
        </div>
        {driver ? (
          <button
            type="button"
            onClick={() => toggleMutation.mutate(!driver.online)}
            disabled={toggleMutation.isPending}
            className={
              driver.online
                ? 'flex items-center gap-2 rounded-full bg-success/15 px-3 py-2 text-xs font-bold text-success'
                : 'flex items-center gap-2 rounded-full bg-surface-2 px-3 py-2 text-xs font-bold text-muted'
            }
          >
            <span className={driver.online ? 'h-2.5 w-2.5 rounded-full bg-success' : 'h-2.5 w-2.5 rounded-full bg-muted'} />
            {driver.online ? t('driver.online') : t('driver.offline')}
          </button>
        ) : null}
      </div>

      {query.isPending ? (
        <SkeletonList rows={3} className="mt-5" />
      ) : query.isError || !driver ? (
        <EmptyState
          icon={<RefreshIcon size={26} />}
          title={t('common.error')}
          action={
            <button
              type="button"
              className="text-sm font-semibold text-accent"
              onClick={() => query.refetch()}
            >
              {t('common.retry')}
            </button>
          }
        />
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Card className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-warning/15 text-warning">
                <StarIcon size={20} filled />
              </span>
              <div>
                <p className="text-lg font-extrabold text-text">{driver.rating.toFixed(1)}</p>
                <p className="text-xs text-muted">{t('driver.statsRating')}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-accent-soft text-accent">
                <CarIcon size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text">{driver.vehicle_category}</p>
                <p className="text-xs text-muted">{driver.vehicle?.plate ?? t('driver.vehicle')}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-success/15 text-success">
                <BusIcon size={20} />
              </span>
              <div>
                <p className="text-lg font-extrabold text-text">{orders.length}</p>
                <p className="text-xs text-muted">{t('driver.statsOrders')}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-accent-soft text-accent">
                <CreditCardIcon size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text">{formatSom(earnings)}</p>
                <p className="text-xs text-muted">{t('driver.earnings')}</p>
              </div>
            </Card>
          </div>

          <div className="mt-3">
            <Card className="p-1.5">
              <ListItem
                icon={<MapIcon size={20} />}
                title={t('driver.mapTitle')}
                subtitle={pendingCount > 0 ? t('driver.passengers', { count: pendingCount }) : undefined}
                onClick={() => navigate('/app/driver/map')}
              />
              <ListItem
                icon={<ChatIcon size={20} />}
                title={t('chat.title')}
                onClick={() => navigate('/app/chats')}
              />
              <ListItem
                icon={<StarIcon size={20} />}
                title={t('driver.ratingsTitle')}
                onClick={() => navigate('/app/driver/ratings')}
              />
              <ListItem
                icon={<LogoutIcon size={20} />}
                title={t('driver.finishWork')}
                danger
                onClick={() => {
                  if (driver.online) finishWorkMutation.mutate()
                }}
              />
            </Card>
          </div>

          <h2 className="mt-6 text-base font-bold text-text">{t('driver.todayOrders')}</h2>
          <div className="mt-3 flex flex-col gap-3">
            {orders.length === 0 ? (
              <EmptyState icon={<BusIcon size={26} />} title={t('driver.noOrders')} />
            ) : (
              orders.map((order) => (
                <Card key={order.id} className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-accent-soft text-accent">
                    <BusIcon size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-text">{order.route_name}</p>
                    <p className="truncate text-xs text-muted">
                      {order.from_name} - {order.to_name}
                    </p>
                    <p className="text-xs text-muted">{formatDateTime(order.time, lang)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-sm font-bold text-accent">{formatSom(order.price_som)}</p>
                    <Badge tone={STATUS_TONES[order.status] ?? 'neutral'}>
                      {STATUS_KEYS[order.status] ? t(STATUS_KEYS[order.status] as string) : order.status}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
