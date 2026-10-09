import { useEffect, useState, type FormEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmModal, Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Input } from '../components/Input'
import { Pagination } from '../components/Pagination'
import { Select } from '../components/Select'
import { Table, type Column } from '../components/Table'
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../components/icons'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { apiDelete, apiGet, apiPatch, apiPost, errorMessage, fetchPage } from '../lib/api'
import { formatPrice } from '../lib/utils'
import { toast } from '../store/toast'
import type { RouteDetailOut, RouteOut, RouteStopOut, RouteType } from '../types'

const PAGE_SIZE = 20

const ROUTE_TYPES: RouteType[] = ['bus', 'minibus', 'taxi', 'train']

interface RouteForm {
  name: string
  type: RouteType
  city: string
  from_name: string
  to_name: string
  first_time: string
  last_time: string
  interval_min: string
  price: string
  color: string
}

const emptyForm: RouteForm = {
  name: '',
  type: 'bus',
  city: '',
  from_name: '',
  to_name: '',
  first_time: '06:00',
  last_time: '22:00',
  interval_min: '10',
  price: '2000',
  color: '#2F6BFF',
}

interface StopRow {
  name: string
  lat: string
  lng: string
  order: string
}

export function RouteList() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RouteOut | null>(null)
  const [form, setForm] = useState<RouteForm>(emptyForm)
  const [stops, setStops] = useState<StopRow[]>([])
  const [pendingDelete, setPendingDelete] = useState<RouteOut | null>(null)

  const search = useDebouncedValue(searchInput, 400)
  const params = { page, page_size: PAGE_SIZE, search: search || undefined }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-routes', params],
    queryFn: () => fetchPage<RouteOut>('/admin/routes', params),
    placeholderData: keepPreviousData,
  })

  const detailQuery = useQuery({
    queryKey: ['route-detail', editing?.id],
    queryFn: () => apiGet<RouteDetailOut>(`/routes/${editing?.id}`),
    enabled: Boolean(editing?.id),
  })

  useEffect(() => {
    if (detailQuery.data) {
      setStops(
        (detailQuery.data.stops ?? []).map((stop) => ({
          name: stop.name,
          lat: String(stop.lat),
          lng: String(stop.lng),
          order: String(stop.order),
        })),
      )
    }
  }, [detailQuery.data])

  const saveMutation = useMutation({
    mutationFn: (payload: { id?: number; body: Record<string, unknown> }) =>
      payload.id
        ? apiPatch<RouteOut>(`/admin/routes/${payload.id}`, payload.body)
        : apiPost<RouteOut>('/admin/routes', payload.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-routes'] })
      void queryClient.invalidateQueries({ queryKey: ['routes-options'] })
      toast.success(editing ? t('toast.updated') : t('toast.created'))
      closeModal()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/routes/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-routes'] })
      toast.success(t('toast.deleted'))
      setPendingDelete(null)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setStops([])
    setModalOpen(true)
  }

  const openEdit = (route: RouteOut) => {
    setEditing(route)
    setForm({
      name: route.name ?? '',
      type: route.type ?? 'bus',
      city: route.city ?? '',
      from_name: route.from_name ?? '',
      to_name: route.to_name ?? '',
      first_time: route.first_time ?? '',
      last_time: route.last_time ?? '',
      interval_min: String(route.interval_min ?? ''),
      price: String(route.price ?? ''),
      color: route.color ?? '#2F6BFF',
    })
    setStops([])
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
    setStops([])
  }

  const addStop = () => {
    setStops((prev) => [
      ...prev,
      { name: '', lat: '', lng: '', order: String(prev.length + 1) },
    ])
  }

  const updateStop = (index: number, patch: Partial<StopRow>) => {
    setStops((prev) =>
      prev.map((stop, i) => (i === index ? { ...stop, ...patch } : stop)),
    )
  }

  const removeStop = (index: number) => {
    setStops((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((stop, i) => ({ ...stop, order: String(i + 1) })),
    )
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.error(t('common.required'))
      return
    }
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      city: form.city.trim(),
      from_name: form.from_name.trim(),
      to_name: form.to_name.trim(),
      first_time: form.first_time,
      last_time: form.last_time,
      interval_min: Number(form.interval_min) || 0,
      price: Number(form.price) || 0,
      color: form.color,
      stops: stops
        .filter((stop) => stop.name.trim())
        .map((stop: StopRow, index): RouteStopOut => ({
          name: stop.name.trim(),
          lat: Number(stop.lat) || 0,
          lng: Number(stop.lng) || 0,
          order: Number(stop.order) || index + 1,
        })),
    }
    saveMutation.mutate({ id: editing?.id, body })
  }

  const columns: Column<RouteOut>[] = [
    {
      key: 'name',
      header: t('routes.name'),
      render: (row) => (
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: row.color || '#2F6BFF' }}
          />
          <span className="font-medium text-navy">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('routes.type'),
      render: (row) => <Badge variant="primary">{t(`routes.types.${row.type}`)}</Badge>,
    },
    { key: 'city', header: t('routes.city') },
    {
      key: 'direction',
      header: `${t('routes.from')} → ${t('routes.to')}`,
      render: (row) => `${row.from_name} → ${row.to_name}`,
    },
    {
      key: 'price',
      header: t('routes.price'),
      render: (row) => formatPrice(row.price),
    },
    { key: 'stops_count', header: t('routes.stopsCount') },
    { key: 'vehicles_count', header: t('routes.vehiclesCount') },
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
            onClick={() => openEdit(row)}
            title={t('common.edit')}
          >
            <EditIcon width={16} height={16} />
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-64">
          <Input
            placeholder={t('common.search')}
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              setPage(1)
            }}
            leftIcon={<SearchIcon width={18} height={18} />}
          />
        </div>
        <Button leftIcon={<PlusIcon width={18} height={18} />} onClick={openCreate}>
          {t('routes.addRoute')}
        </Button>
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
              rows={data?.items ?? []}
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
        open={modalOpen}
        onClose={closeModal}
        title={editing ? t('routes.editRoute') : t('routes.addRoute')}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="route-form"
              loading={saveMutation.isPending}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="route-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label={t('routes.name')}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="85-avtobus"
            />
            <Select
              label={t('routes.type')}
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value as RouteType })
              }
              options={ROUTE_TYPES.map((type) => ({
                value: type,
                label: t(`routes.types.${type}`),
              }))}
            />
            <Input
              label={t('routes.city')}
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
            <Input
              label={t('routes.from')}
              value={form.from_name}
              onChange={(event) =>
                setForm({ ...form, from_name: event.target.value })
              }
            />
            <Input
              label={t('routes.to')}
              value={form.to_name}
              onChange={(event) => setForm({ ...form, to_name: event.target.value })}
            />
            <div className="flex items-end gap-3">
              <Input
                label={t('routes.color')}
                type="color"
                value={form.color}
                onChange={(event) => setForm({ ...form, color: event.target.value })}
                className="h-10 p-1"
              />
            </div>
            <Input
              label={t('routes.firstTime')}
              value={form.first_time}
              onChange={(event) =>
                setForm({ ...form, first_time: event.target.value })
              }
              placeholder="06:00"
            />
            <Input
              label={t('routes.lastTime')}
              value={form.last_time}
              onChange={(event) =>
                setForm({ ...form, last_time: event.target.value })
              }
              placeholder="22:00"
            />
            <Input
              label={t('routes.interval')}
              type="number"
              value={form.interval_min}
              onChange={(event) =>
                setForm({ ...form, interval_min: event.target.value })
              }
            />
            <Input
              label={t('routes.price')}
              type="number"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </div>

          <div className="rounded-lg border border-line">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h4 className="text-sm font-semibold text-navy">
                {t('routes.stopsEditor')}
              </h4>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<PlusIcon width={16} height={16} />}
                onClick={addStop}
              >
                {t('routes.addStop')}
              </Button>
            </div>
            {editing && detailQuery.isLoading ? (
              <p className="px-4 py-6 text-center text-xs text-muted">
                {t('common.loading')}
              </p>
            ) : stops.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted">
                {t('common.noData')}
              </p>
            ) : (
              <div className="space-y-3 p-4">
                {stops.map((stop, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 items-end gap-2"
                  >
                    <div className="col-span-12 sm:col-span-4">
                      <Input
                        placeholder={t('routes.stopName')}
                        value={stop.name}
                        onChange={(event) =>
                          updateStop(index, { name: event.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-3">
                      <Input
                        placeholder={t('vehicles.lat')}
                        type="number"
                        value={stop.lat}
                        onChange={(event) =>
                          updateStop(index, { lat: event.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-3">
                      <Input
                        placeholder={t('vehicles.lng')}
                        type="number"
                        value={stop.lng}
                        onChange={(event) =>
                          updateStop(index, { lng: event.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-1">
                      <Input
                        type="number"
                        value={stop.order}
                        onChange={(event) =>
                          updateStop(index, { order: event.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => removeStop(index)}
                      >
                        <TrashIcon width={16} height={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={t('common.delete')}
        message={t('routes.deleteConfirm')}
        loading={deleteMutation.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  )
}
