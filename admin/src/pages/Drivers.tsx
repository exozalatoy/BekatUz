import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Drawer } from '../components/Drawer'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Input } from '../components/Input'
import { Pagination } from '../components/Pagination'
import { Select } from '../components/Select'
import { Table, type Column } from '../components/Table'
import { CheckIcon, CloseIcon, EyeIcon, SearchIcon } from '../components/icons'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { apiPatch, errorMessage, fetchPage } from '../lib/api'
import { formatDate } from '../lib/utils'
import { toast } from '../store/toast'
import type { AdminDriver } from '../types'

const PAGE_SIZE = 20

function driverName(driver: AdminDriver): string {
  return driver.full_name ?? driver.user?.full_name ?? '—'
}

function driverPhone(driver: AdminDriver): string {
  return driver.phone ?? driver.user?.phone ?? '—'
}

function driverRating(driver: AdminDriver): number {
  return driver.rating ?? driver.user?.driver?.rating ?? 0
}

function driverCategory(driver: AdminDriver): string {
  return (
    driver.vehicle_category ??
    driver.user?.driver?.vehicle_category ??
    '—'
  )
}

function isApproved(driver: AdminDriver): boolean {
  return driver.is_approved ?? driver.user?.driver?.is_approved ?? false
}

function isBlocked(driver: AdminDriver): boolean {
  return driver.is_blocked ?? driver.user?.is_blocked ?? false
}

export function DriversPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [approval, setApproval] = useState('')
  const [selected, setSelected] = useState<AdminDriver | null>(null)

  const search = useDebouncedValue(searchInput, 400)

  const params = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    is_approved: approval === '' ? undefined : approval === 'approved',
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-drivers', params],
    queryFn: () => fetchPage<AdminDriver>('/admin/drivers', params),
    placeholderData: keepPreviousData,
  })

  const updateDriver = useMutation({
    mutationFn: (payload: { id: number; body: Partial<AdminDriver> }) =>
      apiPatch<AdminDriver>(`/admin/drivers/${payload.id}`, payload.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
      toast.success(t('toast.updated'))
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const rawItems = data?.items ?? []
  const items = rawItems.filter((driver) => {
    if (search) {
      const needle = search.toLowerCase()
      const haystack = `${driverName(driver)} ${driverPhone(driver)}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    if (approval === 'approved' && !isApproved(driver)) return false
    if (approval === 'pending' && isApproved(driver)) return false
    return true
  })

  const columns: Column<AdminDriver>[] = [
    {
      key: 'full_name',
      header: t('drivers.name'),
      render: (row) => (
        <span className="font-medium text-navy">{driverName(row)}</span>
      ),
    },
    { key: 'phone', header: t('drivers.phone'), render: (row) => driverPhone(row) },
    {
      key: 'category',
      header: t('drivers.category'),
      render: (row) => driverCategory(row),
    },
    {
      key: 'rating',
      header: t('drivers.rating'),
      render: (row) => (
        <span className="font-medium text-navy">
          {driverRating(row).toFixed(1)}
        </span>
      ),
    },
    {
      key: 'approved',
      header: t('drivers.approved'),
      render: (row) =>
        isApproved(row) ? (
          <Badge variant="success">{t('common.yes')}</Badge>
        ) : (
          <Badge variant="warning">{t('common.no')}</Badge>
        ),
    },
    {
      key: 'status',
      header: t('drivers.status'),
      render: (row) =>
        isBlocked(row) ? (
          <Badge variant="danger">{t('users.blocked')}</Badge>
        ) : (
          <Badge variant="success">{t('users.active')}</Badge>
        ),
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
            title={t('common.view')}
          >
            <EyeIcon width={16} height={16} />
          </Button>
          {isApproved(row) ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger-soft"
              onClick={() =>
                updateDriver.mutate({ id: row.id, body: { is_approved: false } })
              }
            >
              <CloseIcon width={16} height={16} />
              {t('drivers.reject')}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-success hover:bg-success-soft"
              onClick={() =>
                updateDriver.mutate({ id: row.id, body: { is_approved: true } })
              }
            >
              <CheckIcon width={16} height={16} />
              {t('drivers.approve')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              updateDriver.mutate({
                id: row.id,
                body: { is_blocked: !isBlocked(row) },
              })
            }
          >
            {isBlocked(row) ? t('users.unblock') : t('users.block')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Card padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <div className="min-w-[220px] flex-1">
            <Input
              placeholder={t('drivers.searchPlaceholder')}
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
                setPage(1)
              }}
              leftIcon={<SearchIcon width={18} height={18} />}
            />
          </div>
          <div className="w-44">
            <Select
              value={approval}
              onChange={(event) => {
                setApproval(event.target.value)
                setPage(1)
              }}
              options={[
                { value: 'approved', label: t('drivers.approved') },
                { value: 'pending', label: t('reviews.statuses.pending') },
              ]}
              placeholder={t('common.all')}
            />
          </div>
        </div>

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

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={t('drivers.detailTitle')}
      >
        {selected && (
          <dl className="space-y-3 text-sm">
            <DetailRow label={t('drivers.name')} value={driverName(selected)} />
            <DetailRow label={t('drivers.phone')} value={driverPhone(selected)} />
            <DetailRow
              label={t('drivers.category')}
              value={driverCategory(selected)}
            />
            <DetailRow
              label={t('drivers.rating')}
              value={driverRating(selected).toFixed(1)}
            />
            <DetailRow
              label={t('drivers.approved')}
              value={isApproved(selected) ? t('common.yes') : t('common.no')}
            />
            <DetailRow
              label={t('drivers.status')}
              value={isBlocked(selected) ? t('users.blocked') : t('users.active')}
            />
            <DetailRow
              label={t('users.createdAt')}
              value={formatDate(selected.created_at)}
            />
          </dl>
        )}
      </Drawer>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-navy">{value}</dd>
    </div>
  )
}
