import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge, type BadgeVariant } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Modal, ConfirmModal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import { Select } from '../components/Select'
import { Table, type Column } from '../components/Table'
import { CheckIcon, CloseIcon, EyeIcon } from '../components/icons'
import { apiPost, errorMessage, fetchPage } from '../lib/api'
import { formatDateTime, formatPrice } from '../lib/utils'
import { toast } from '../store/toast'
import type { PaymentOut, PaymentStatus } from '../types'

const PAGE_SIZE = 20

const statusVariants: Record<PaymentStatus, BadgeVariant> = {
  pending: 'neutral',
  review: 'warning',
  paid: 'success',
  rejected: 'danger',
}

export function PaymentsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('review')
  const [selected, setSelected] = useState<PaymentOut | null>(null)
  const [pendingAction, setPendingAction] = useState<{ payment: PaymentOut; action: 'approve' | 'reject' } | null>(null)

  const params = { page, page_size: PAGE_SIZE, status: status || undefined }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-payments', params],
    queryFn: () => fetchPage<PaymentOut>('/admin/payments', params),
    placeholderData: keepPreviousData,
  })

  const reviewMutation = useMutation({
    mutationFn: (payload: { id: number; action: 'approve' | 'reject' }) =>
      apiPost<PaymentOut>(`/admin/payments/${payload.id}/${payload.action}`),
    onSuccess: (payment, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
      toast.success(variables.action === 'approve' ? t('payments.approved') : t('payments.rejected'))
      setSelected(null)
      setPendingAction(null)
      if (payment.id) void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const items = data?.items ?? []

  const columns: Column<PaymentOut>[] = [
    {
      key: 'user',
      header: t('payments.user'),
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{row.user_name ?? row.user_phone ?? `#${row.user_id}`}</p>
          {row.user_phone && row.user_name ? (
            <p className="text-xs text-muted">{row.user_phone}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'plan_name',
      header: t('payments.plan'),
      render: (row) => <span className="text-navy">{row.plan_name ?? '—'}</span>,
    },
    {
      key: 'amount',
      header: t('payments.amount'),
      render: (row) => <span className="font-medium text-navy">{formatPrice(row.amount, row.currency)}</span>,
    },
    {
      key: 'status',
      header: t('payments.status'),
      render: (row) => (
        <Badge variant={statusVariants[row.status] ?? 'neutral'}>
          {t(`payments.statuses.${row.status}`)}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: t('payments.date'),
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
            onClick={() => setSelected(row)}
            title={t('payments.viewReceipt')}
          >
            <EyeIcon width={16} height={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-success hover:bg-success-soft"
            disabled={row.status === 'paid'}
            onClick={() => setPendingAction({ payment: row, action: 'approve' })}
          >
            <CheckIcon width={16} height={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-soft"
            disabled={row.status === 'paid'}
            onClick={() => setPendingAction({ payment: row, action: 'reject' })}
          >
            <CloseIcon width={16} height={16} />
          </Button>
        </div>
      ),
    },
  ]

  const runAction = (payment: PaymentOut, action: 'approve' | 'reject') => {
    setPendingAction(null)
    reviewMutation.mutate({ id: payment.id, action })
  }

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
            { value: 'review', label: t('payments.statuses.review') },
            { value: 'pending', label: t('payments.statuses.pending') },
            { value: 'paid', label: t('payments.statuses.paid') },
            { value: 'rejected', label: t('payments.statuses.rejected') },
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

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={t('payments.viewReceipt')}
        size="md"
        footer={
          selected ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setSelected(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={() => runAction(selected, 'reject')}
                loading={reviewMutation.isPending}
              >
                {t('payments.reject')}
              </Button>
              <Button
                onClick={() => runAction(selected, 'approve')}
                loading={reviewMutation.isPending}
              >
                {t('payments.approve')}
              </Button>
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-muted">{t('payments.user')}</p>
                <p className="font-medium text-navy">
                  {selected.user_name ?? selected.user_phone ?? `#${selected.user_id}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">{t('payments.plan')}</p>
                <p className="font-medium text-navy">{selected.plan_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted">{t('payments.amount')}</p>
                <p className="font-medium text-navy">
                  {formatPrice(selected.amount, selected.currency)}
                </p>
              </div>
              <div>
                <Badge variant={statusVariants[selected.status] ?? 'neutral'}>
                  {t(`payments.statuses.${selected.status}`)}
                </Badge>
              </div>
            </div>

            {selected.receipt_data ? (
              <img
                src={selected.receipt_data}
                alt={t('payments.viewReceipt')}
                className="w-full rounded-lg border border-line bg-surface object-contain"
              />
            ) : (
              <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-muted">
                {t('payments.noReceipt')}
              </p>
            )}
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={Boolean(pendingAction)}
        title={pendingAction?.action === 'approve' ? t('payments.approve') : t('payments.reject')}
        message={
          pendingAction?.action === 'approve'
            ? t('payments.approveConfirm')
            : t('payments.rejectConfirm')
        }
        confirmLabel={pendingAction?.action === 'approve' ? t('payments.approve') : t('payments.reject')}
        loading={reviewMutation.isPending}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) runAction(pendingAction.payment, pendingAction.action)
        }}
      />
    </div>
  )
}