import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { SkeletonList } from '../../components/Skeleton'
import { StarIcon } from '../../components/icons'
import { TopBar } from '../../components/TopBar'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/utils'
import type { DriverRatings as DriverRatingsData, Lang } from '../../lib/types'

export function DriverRatings() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.language as Lang

  const query = useQuery({
    queryKey: ['driver-ratings'],
    queryFn: () => api.get<DriverRatingsData>('/drivers/me/ratings'),
  })

  const items = query.data?.items.items ?? []
  const average = query.data?.average ?? 0
  const distribution = query.data?.distribution ?? { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
  const total = Object.values(distribution).reduce((sum, value) => sum + value, 0)

  return (
    <div className="pb-8">
      <TopBar title={t('driver.ratingsTitle')} onBack={() => navigate('/app/driver')} />
      <div className="px-4 pt-4">
        <Card className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-4xl font-extrabold text-text">{average.toFixed(1)}</p>
            <div className="mt-1 flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  size={14}
                  filled={star <= Math.round(average)}
                  className={star <= Math.round(average) ? 'text-warning' : 'text-border'}
                />
              ))}
            </div>
          </div>
          <div className="h-16 w-px bg-border" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-text">{t('ratings.average')}</p>
            <p className="text-xs text-muted">{t('ratings.reviews', { count: total })}</p>
          </div>
        </Card>

        <Card className="mt-4">
          <p className="mb-3 text-sm font-bold text-text">{t('ratings.distribution')}</p>
          <div className="flex flex-col gap-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[String(star)] ?? 0
              const percent = total > 0 ? (count / total) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-8 text-xs font-semibold text-muted">{star}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-warning"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                  <span className="w-8 text-right text-xs text-muted">{count}</span>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="mt-4 flex flex-col gap-3">
          {query.isPending ? (
            <SkeletonList rows={3} />
          ) : items.length === 0 ? (
            <EmptyState icon={<StarIcon size={28} />} title={t('ratings.empty')} />
          ) : (
            items.map((review) => (
              <Card key={review.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Avatar name={review.passenger_name ?? '?'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">
                      {review.passenger_name ?? t('chat.you')}
                    </p>
                    <p className="text-xs text-muted">{formatDate(review.created_at, lang)}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon
                        key={star}
                        size={14}
                        filled={star <= review.rating}
                        className={star <= review.rating ? 'text-warning' : 'text-border'}
                      />
                    ))}
                  </div>
                </div>
                {review.comment ? <p className="text-sm text-muted">{review.comment}</p> : null}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
