import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { ReviewSheet, type ReviewDriver } from '../../components/ReviewSheet'
import { SkeletonList } from '../../components/Skeleton'
import { TopBar } from '../../components/TopBar'
import { StarIcon } from '../../components/icons'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'
import type { Lang, Page, ReviewOut, VehicleOut } from '../../lib/types'

export function Ratings() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const lang = i18n.language as Lang
  const [reviewOpen, setReviewOpen] = useState(false)

  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'mine'],
    queryFn: () => api.get<Page<ReviewOut>>('/reviews', { page: 1, page_size: 100 }),
    enabled: user?.role !== 'driver',
  })

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', 'review-drivers'],
    queryFn: () => api.get<{ items: VehicleOut[] }>('/vehicles'),
    enabled: user?.role !== 'driver',
  })

  const myReviews = useMemo(
    () => (reviewsQuery.data?.items ?? []).filter((review) => review.passenger_id === user?.id),
    [reviewsQuery.data, user?.id],
  )

  const drivers = useMemo<ReviewDriver[]>(() => {
    const map = new Map<number, ReviewDriver>()
    ;(vehiclesQuery.data?.items ?? []).forEach((vehicle) => {
      if (vehicle.driver_id != null && !map.has(vehicle.driver_id)) {
        map.set(vehicle.driver_id, {
          id: vehicle.driver_id,
          label: vehicle.route?.name ?? t('map.driver'),
          sub: vehicle.plate,
        })
      }
    })
    return Array.from(map.values())
  }, [vehiclesQuery.data, t])

  if (user?.role === 'driver') {
    return <Navigate to="/app/driver/ratings" replace />
  }

  const average =
    myReviews.length > 0
      ? myReviews.reduce((sum, review) => sum + review.rating, 0) / myReviews.length
      : 0

  return (
    <div className="pb-8">
      <TopBar title={t('ratings.title')} onBack={() => navigate('/app/profile')} />
      <div className="px-4 pt-4">
        <Card className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-extrabold text-text">
              {myReviews.length > 0 ? average.toFixed(1) : '—'}
            </p>
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
          <div className="h-14 w-px bg-border" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-text">{t('ratings.yourReviews')}</p>
            <p className="text-xs text-muted">{t('ratings.reviews', { count: myReviews.length })}</p>
          </div>
        </Card>

        <Button
          fullWidth
          className="mt-4"
          disabled={drivers.length === 0}
          onClick={() => setReviewOpen(true)}
        >
          {t('ratings.leaveReview')}
        </Button>

        <div className="mt-4 flex flex-col gap-3">
          {reviewsQuery.isPending ? (
            <SkeletonList rows={3} />
          ) : myReviews.length === 0 ? (
            <EmptyState
              icon={<StarIcon size={28} />}
              title={t('ratings.empty')}
              description={t('ratings.reviewDrivers')}
            />
          ) : (
            myReviews.map((review) => (
              <Card key={review.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <StarIcon size={18} filled />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">
                      {t('map.driver')} #{review.driver_id}
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

      <ReviewSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        drivers={drivers}
      />
    </div>
  )
}
