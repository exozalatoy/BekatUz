import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { Sheet } from './Sheet'
import { StarRating } from './StarRating'
import { useToast } from './toast-context'
import { api } from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import type { ReviewOut } from '../lib/types'

export type ReviewDriver = {
  id: number
  label: string
  sub?: string
}

export function ReviewSheet({
  open,
  onClose,
  drivers,
  initialDriverId,
}: {
  open: boolean
  onClose: () => void
  drivers: ReviewDriver[]
  initialDriverId?: number
}) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onClose={onClose} title={t('review.title')}>
      <ReviewForm onClose={onClose} drivers={drivers} initialDriverId={initialDriverId} />
    </Sheet>
  )
}

function ReviewForm({
  onClose,
  drivers,
  initialDriverId,
}: {
  onClose: () => void
  drivers: ReviewDriver[]
  initialDriverId?: number
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [driverId, setDriverId] = useState<number | null>(initialDriverId ?? drivers[0]?.id ?? null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.post<ReviewOut>('/reviews', { driver_id: driverId, rating, comment: comment.trim() }),
    onSuccess: () => {
      toast.show(t('review.submitted'), 'success')
      void queryClient.invalidateQueries({ queryKey: ['reviews'] })
      void queryClient.invalidateQueries({ queryKey: ['driver-ratings'] })
      onClose()
    },
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  return (
    <div className="flex flex-col gap-4">
      {drivers.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted">{t('review.chooseDriver')}</p>
          <select
            value={driverId ?? ''}
            onChange={(event) => setDriverId(Number(event.target.value))}
            className="h-11 w-full rounded-btn border border-border bg-surface-2 px-3 text-sm text-text outline-none"
          >
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.label}
                {driver.sub ? ` · ${driver.sub}` : ''}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-semibold text-muted">{t('review.rate')}</p>
        <StarRating value={rating} onChange={setRating} size={32} />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted">{t('review.comment')}</p>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t('review.commentPlaceholder')}
          rows={3}
          className="w-full resize-none rounded-btn border border-border bg-surface-2 p-3 text-sm text-text outline-none"
        />
      </div>

      <Button
        fullWidth
        loading={mutation.isPending}
        disabled={driverId === null}
        onClick={() => mutation.mutate()}
      >
        {t('review.submit')}
      </Button>
    </div>
  )
}
