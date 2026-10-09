import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge, type BadgeVariant } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Pagination } from '../components/Pagination'
import { Select } from '../components/Select'
import { Stars } from '../components/Stars'
import { Table, type Column } from '../components/Table'
import { CheckIcon, CloseIcon } from '../components/icons'
import { apiPatch, errorMessage, fetchPage } from '../lib/api'
import { formatDateTime } from '../lib/utils'
import { toast } from '../store/toast'
import type { ReviewOut, ReviewStatus } from '../types'

const PAGE_SIZE = 20

const statusVariants: Record<ReviewStatus, BadgeVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

export function ReviewsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')

  const params = { page, page_size: PAGE_SIZE, status: status || undefined }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-reviews', params],
    queryFn: () => fetchPage<ReviewOut>('/admin/reviews', params),
    placeholderData: keepPreviousData,
  })

  const statusMutation = useMutation({
    mutationFn: (payload: { id: number; status: ReviewStatus }) =>
      apiPatch<ReviewOut>(`/admin/reviews/${payload.id}`, {
        status: payload.status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
      toast.success(t('toast.updated'))
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const rawItems = data?.items ?? []
  const items = rawItems.filter((review) => {
    if (status && review.status !== status) return false
    return true
  })

  const columns: Column<ReviewOut>[] = [
    {
      key: 'passenger_name',
      header: t('reviews.passenger'),
      render: (row) => (
        <span className="font-medium text-navy">{row.passenger_name}</span>
      ),
    },
    {
      key: 'driver_id',
      header: t('reviews.driver'),
      render: (row) => `#${row.driver_id}`,
    },
    {
      key: 'rating',
      header: t('reviews.rating'),
      render: (row) => <Stars rating={row.rating} />,
    },
    {
      key: 'comment',
      header: t('reviews.comment'),
      render: (row) => (
        <span className="line-clamp-2 max-w-xs text-muted">{row.comment}</span>
      ),
    },
    {
      key: 'status',
      header: t('reviews.status'),
      render: (row) => (
        <Badge variant={statusVariants[row.status] ?? 'neutral'}>
          {t(`reviews.statuses.${row.status}`)}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: t('reviews.date'),
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      headerClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="text-success hover:bg-success-soft"
            disabled={row.status === 'approved'}
            onClick={() =>
              statusMutation.mutate({ id: row.id, status: 'approved' })
            }
          >
            <CheckIcon width={16} height={16} />
            {t('reviews.approve')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-soft"
            disabled={row.status === 'rejected'}
            onClick={() =>
              statusMutation.mutate({ id: row.id, status: 'rejected' })
            }
          >
            <CloseIcon width={16} height={16} />
            {t('reviews.reject')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="w-52">
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
          options={[
            { value: 'pending', label: t('reviews.statuses.pending') },
            { value: 'approved', label: t('reviews.statuses.approved') },
            { value: 'rejected', label: t('reviews.statuses.rejected') },
          ]}
          placeholder={t('common.all')}
        />
      </div>

      <Card padded={false}>
        {isError ? (
          <ErrorState
            message={errorMessage(error)}
            onRetry={() => void refetch()}
            retryLabel={t('common.retry')}
          />
        ) : (
          <>
            <Table
              columns={columns}
              rows={items}
              rowKey={(row) => row.id}
              loading={isLoading}
              empty={<EmptyState title={t('common.noData')} />}
            />
            <Pagination
              page={data?.page ?? page}
              pages={data?.pages ?? 1}
              total={data?.total ?? 0}
              onPageChange={setPage}
              className="border-t border-line"
            />
          </>
        )}
      </Card>
    </div>
  )
}
