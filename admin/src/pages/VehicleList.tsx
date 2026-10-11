import { useMemo, useState, type FormEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge, type BadgeVariant } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmModal, Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Input } from '../components/Input'
import { Pagination } from '../components/Pagination'
import { Select } from '../components/Select'
import { Table, type Column } from '../components/Table'
import { EditIcon, PlusIcon, TrashIcon } from '../components/icons'
import { apiDelete, apiGet, apiPatch, apiPost, errorMessage, fetchPage } from '../lib/api'
import { formatDateTime } from '../lib/utils'
import { toast } from '../store/toast'
import type { AdminDriver, RouteOut, VehicleOut, VehicleStatus } from '../types'

const PAGE_SIZE = 20

const CATEGORIES = ['Avtobus', 'Mikroavtobus', 'Gazel', 'Yengil avto']

const statusVariants: Record<VehicleStatus, BadgeVariant> = {
  moving: 'success',
  idle: 'warning',
  offline: 'neutral',
}

interface VehicleForm {
  route_id: string
  driver_id: string
  plate: string
  category: string
  status: VehicleStatus
  lat: string
  lng: string
  seats_total: string
  seats_free: string
}

const emptyForm: VehicleForm = {
  route_id: '',
  driver_id: '',
  plate: '',
  category: CATEGORIES[0],
  status: 'idle',
  lat: '',
  lng: '',
  seats_total: '40',
  seats_free: '40',
}

export function VehicleList() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<VehicleOut | null>(null)
  const [form, setForm] = useState<VehicleForm>(emptyForm)
  const [pendingDelete, setPendingDelete] = useState<VehicleOut | null>(null)

  const params = { page, page_size: PAGE_SIZE, status: status || undefined }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-vehicles', params],
    queryFn: () => fetchPage<VehicleOut>('/admin/vehicles', params),
    placeholderData: keepPreviousData,
  })

  const routesQuery = useQuery({
    queryKey: ['routes-options'],
    queryFn: async () => {
      const response = await apiGet<{ items?: RouteOut[] } | RouteOut[]>(
        '/admin/routes',
        { page_size: 200 },
      )
      return Array.isArray(response) ? response : response.items ?? []
    },
  })

  const driversQuery = useQuery({
    queryKey: ['drivers-options'],
    queryFn: () => fetchPage<AdminDriver>('/admin/drivers', { page_size: 200 }),
  })

  const routeOptions = useMemo(
    () =>
      (routesQuery.data ?? []).map((route) => ({
        value: String(route.id),
        label: route.name,
      })),
    [routesQuery.data],
  )

  const driverOptions = useMemo(
    () =>
      (driversQuery.data?.items ?? []).map((driver) => ({
        value: String(driver.id),
        label: driver.full_name ?? driver.user?.full_name ?? `#${driver.id}`,
      })),
    [driversQuery.data],
  )

  const saveMutation = useMutation({
    mutationFn: (payload: { id?: number; body: Record<string, unknown> }) =>
      payload.id
        ? apiPatch<VehicleOut>(`/admin/vehicles/${payload.id}`, payload.body)
        : apiPost<VehicleOut>('/admin/vehicles', payload.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-vehicles'] })
      toast.success(editing ? t('toast.updated') : t('toast.created'))
      closeModal()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/vehicles/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-vehicles'] })
      toast.success(t('toast.deleted'))
      setPendingDelete(null)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
    void routesQuery.refetch()
    void driversQuery.refetch()
  }

  const openEdit = (vehicle: VehicleOut) => {
    setEditing(vehicle)
    setForm({
      route_id: String(vehicle.route_id ?? ''),
      driver_id: String(vehicle.driver_id ?? ''),
      plate: vehicle.plate ?? '',
      category: vehicle.category ?? CATEGORIES[0],
      status: vehicle.status ?? 'idle',
      lat: String(vehicle.lat ?? ''),
      lng: String(vehicle.lng ?? ''),
      seats_total: String(vehicle.seats_total ?? ''),
      seats_free: String(vehicle.seats_free ?? ''),
    })
    setModalOpen(true)
    void routesQuery.refetch()
    void driversQuery.refetch()
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.plate.trim() || !form.route_id) {
      toast.error(t('common.required'))
      return
    }
    const body: Record<string, unknown> = {
      route_id: Number(form.route_id),
      driver_id: form.driver_id ? Number(form.driver_id) : null,
      plate: form.plate.trim(),
      category: form.category,
      status: form.status,
      seats_total: Number(form.seats_total) || 0,
      seats_free: Number(form.seats_free) || 0,
    }
    if (form.lat !== '') body.lat = Number(form.lat)
    if (form.lng !== '') body.lng = Number(form.lng)
    saveMutation.mutate({ id: editing?.id, body })
  }

  const columns: Column<VehicleOut>[] = [
    {
      key: 'plate',
      header: t('vehicles.plate'),
      render: (row) => (
        <span className="font-medium text-navy">{row.plate}</span>
      ),
    },
    {
      key: 'route',
      header: t('vehicles.route'),
      render: (row) => row.route?.name ?? `#${row.route_id}`,
    },
    {
      key: 'driver',
      header: t('vehicles.driver'),
      render: (row) => `#${row.driver_id ?? '—'}`,
    },
    { key: 'category', header: t('vehicles.category') },
    {
      key: 'status',
      header: t('vehicles.status'),
      render: (row) => (
        <Badge variant={statusVariants[row.status] ?? 'neutral'}>
          {t(`vehicles.statuses.${row.status}`)}
        </Badge>
      ),
    },
    {
      key: 'seats',
      header: t('vehicles.seats'),
      render: (row) => `${row.seats_free}/${row.seats_total}`,
    },
    {
      key: 'updated_at',
      header: t('vehicles.updated'),
      render: (row) => formatDateTime(row.updated_at),
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
        <div className="w-48">
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            options={[
              { value: 'moving', label: t('vehicles.statuses.moving') },
              { value: 'idle', label: t('vehicles.statuses.idle') },
              { value: 'offline', label: t('vehicles.statuses.offline') },
            ]}
            placeholder={t('common.all')}
          />
        </div>
        <Button leftIcon={<PlusIcon width={18} height={18} />} onClick={openCreate}>
          {t('vehicles.addVehicle')}
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
        title={editing ? t('vehicles.editVehicle') : t('vehicles.addVehicle')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="vehicle-form"
              loading={saveMutation.isPending}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="vehicle-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('vehicles.plate')}
            value={form.plate}
            onChange={(event) => setForm({ ...form, plate: event.target.value })}
            placeholder="01A123BC"
          />
          <Select
            label={t('vehicles.category')}
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
            options={CATEGORIES.map((category) => ({ value: category, label: category }))}
          />
          <Select
            label={t('vehicles.route')}
            value={form.route_id}
            onChange={(event) => setForm({ ...form, route_id: event.target.value })}
            options={routeOptions}
            placeholder={t('vehicles.selectRoute')}
          />
          <Select
            label={t('vehicles.driver')}
            value={form.driver_id}
            onChange={(event) => setForm({ ...form, driver_id: event.target.value })}
            options={driverOptions}
            placeholder={t('vehicles.selectDriver')}
          />
          <Select
            label={t('vehicles.status')}
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value as VehicleStatus })
            }
            options={[
              { value: 'moving', label: t('vehicles.statuses.moving') },
              { value: 'idle', label: t('vehicles.statuses.idle') },
              { value: 'offline', label: t('vehicles.statuses.offline') },
            ]}
          />
          <Input
            label={t('vehicles.lat')}
            type="number"
            value={form.lat}
            onChange={(event) => setForm({ ...form, lat: event.target.value })}
          />
          <Input
            label={t('vehicles.lng')}
            type="number"
            value={form.lng}
            onChange={(event) => setForm({ ...form, lng: event.target.value })}
          />
          <Input
            label={t('vehicles.seatsTotal')}
            type="number"
            value={form.seats_total}
            onChange={(event) => setForm({ ...form, seats_total: event.target.value })}
          />
          <Input
            label={t('vehicles.seatsFree')}
            type="number"
            value={form.seats_free}
            onChange={(event) => setForm({ ...form, seats_free: event.target.value })}
          />
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={t('common.delete')}
        message={t('vehicles.deleteConfirm')}
        loading={deleteMutation.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  )
}
