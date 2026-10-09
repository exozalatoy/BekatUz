import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmModal } from '../components/Modal'
import { Drawer } from '../components/Drawer'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Input } from '../components/Input'
import { Pagination } from '../components/Pagination'
import { Select } from '../components/Select'
import { Table, type Column } from '../components/Table'
import { EyeIcon, SearchIcon, TrashIcon } from '../components/icons'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { apiDelete, apiPatch, errorMessage, fetchPage } from '../lib/api'
import { formatDate } from '../lib/utils'
import { toast } from '../store/toast'
import type { UserOut } from '../types'

const PAGE_SIZE = 20

export function UsersPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<UserOut | null>(null)
  const [pendingDelete, setPendingDelete] = useState<UserOut | null>(null)

  const search = useDebouncedValue(searchInput, 400)

  const params = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    role: role || undefined,
    status: status || undefined,
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => fetchPage<UserOut>('/admin/users', params),
    placeholderData: keepPreviousData,
  })

  const blockMutation = useMutation({
    mutationFn: (payload: { id: number; is_blocked: boolean }) =>
      apiPatch<UserOut>(`/admin/users/${payload.id}`, {
        is_blocked: payload.is_blocked,
      }),
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(user.is_blocked ? t('users.blocked') : t('users.active'))
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/users/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(t('toast.deleted'))
      setPendingDelete(null)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const rawItems = data?.items ?? []
  const items = rawItems.filter((user) => {
    if (search) {
      const needle = search.toLowerCase()
      const haystack = `${user.full_name} ${user.phone} ${user.email ?? ''}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    if (role && user.role !== role) return false
    if (status === 'active' && user.is_blocked) return false
    if (status === 'blocked' && !user.is_blocked) return false
    return true
  })

  const columns: Column<UserOut>[] = [
    {
      key: 'full_name',
      header: t('users.name'),
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{row.full_name}</p>
          <p className="text-xs text-muted">{row.email ?? '—'}</p>
        </div>
      ),
    },
    { key: 'phone', header: t('users.phone') },
    {
      key: 'role',
      header: t('users.role'),
      render: (row) => (
        <Badge variant="primary">{t(`users.roles.${row.role}`)}</Badge>
      ),
    },
    {
      key: 'premium',
      header: t('users.premium'),
      render: (row) =>
        row.is_premium ? (
          <Badge variant="warning">{t('common.yes')}</Badge>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'status',
      header: t('users.status'),
      render: (row) =>
        row.is_blocked ? (
          <Badge variant="danger">{t('users.blocked')}</Badge>
        ) : (
          <Badge variant="success">{t('users.active')}</Badge>
        ),
    },
    {
      key: 'created_at',
      header: t('users.createdAt'),
      render: (row) => formatDate(row.created_at),
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
          <Button
            variant="ghost"
            size="sm"
            loading={
              blockMutation.isPending && blockMutation.variables?.id === row.id
            }
            onClick={() =>
              blockMutation.mutate({ id: row.id, is_blocked: !row.is_blocked })
            }
          >
            {row.is_blocked ? t('users.unblock') : t('users.block')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-soft"
            onClick={() => setPendingDelete(row)}
            title={t('common.delete')}
          >
            <TrashIcon width={16} height={16} />
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
              placeholder={t('users.searchPlaceholder')}
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
                setPage(1)
              }}
              leftIcon={<SearchIcon width={18} height={18} />}
            />
          </div>
          <div className="w-40">
            <Select
              value={role}
              onChange={(event) => {
                setRole(event.target.value)
                setPage(1)
              }}
              options={[
                { value: 'passenger', label: t('users.roles.passenger') },
                { value: 'driver', label: t('users.roles.driver') },
                { value: 'admin', label: t('users.roles.admin') },
              ]}
              placeholder={t('common.all')}
            />
          </div>
          <div className="w-40">
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              options={[
                { value: 'active', label: t('users.active') },
                { value: 'blocked', label: t('users.blocked') },
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
        title={t('users.detailTitle')}
      >
        {selected && (
          <dl className="space-y-3 text-sm">
            <DetailRow label={t('users.name')} value={selected.full_name} />
            <DetailRow label={t('users.phone')} value={selected.phone} />
            <DetailRow label={t('users.email')} value={selected.email ?? '—'} />
            <DetailRow
              label={t('users.role')}
              value={t(`users.roles.${selected.role}`)}
            />
            <DetailRow
              label={t('users.language')}
              value={selected.language.toUpperCase()}
            />
            <DetailRow
              label={t('users.verified')}
              value={selected.is_verified ? t('common.yes') : t('common.no')}
            />
            <DetailRow
              label={t('users.premium')}
              value={selected.is_premium ? t('common.yes') : t('common.no')}
            />
            <DetailRow
              label={t('users.status')}
              value={
                selected.is_blocked ? t('users.blocked') : t('users.active')
              }
            />
            <DetailRow
              label={t('users.createdAt')}
              value={formatDate(selected.created_at)}
            />
          </dl>
        )}
      </Drawer>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={t('users.deleteTitle')}
        message={t('users.deleteConfirm')}
        loading={deleteMutation.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
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
