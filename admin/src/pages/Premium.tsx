import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmModal, Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Input } from '../components/Input'
import { CloseIcon, CrownIcon, EditIcon, PlusIcon, TrashIcon } from '../components/icons'
import { apiDelete, apiGet, apiPatch, apiPost, errorMessage } from '../lib/api'
import { formatPrice } from '../lib/utils'
import { toast } from '../store/toast'
import type { PlanOut } from '../types'

interface PlanForm {
  name: string
  price: string
  currency: string
  duration_days: string
  is_first_month_free: boolean
}

const emptyForm: PlanForm = {
  name: '',
  price: '',
  currency: 'USD',
  duration_days: '30',
  is_first_month_free: false,
}

export function PremiumPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PlanOut | null>(null)
  const [form, setForm] = useState<PlanForm>(emptyForm)
  const [features, setFeatures] = useState<string[]>([])
  const [featureInput, setFeatureInput] = useState('')
  const [pendingDelete, setPendingDelete] = useState<PlanOut | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const response = await apiGet<{ items?: PlanOut[] } | PlanOut[]>('/admin/plans')
      return Array.isArray(response) ? response : response.items ?? []
    },
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { id?: number; body: Record<string, unknown> }) =>
      payload.id
        ? apiPatch<PlanOut>(`/admin/plans/${payload.id}`, payload.body)
        : apiPost<PlanOut>('/admin/plans', payload.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      toast.success(editing ? t('toast.updated') : t('toast.created'))
      closeModal()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/plans/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      toast.success(t('toast.deleted'))
      setPendingDelete(null)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFeatures([])
    setFeatureInput('')
    setModalOpen(true)
  }

  const openEdit = (plan: PlanOut) => {
    setEditing(plan)
    setForm({
      name: plan.name ?? '',
      price: String(plan.price ?? ''),
      currency: plan.currency ?? 'USD',
      duration_days: String(plan.duration_days ?? ''),
      is_first_month_free: Boolean(plan.is_first_month_free),
    })
    setFeatures(plan.features ?? [])
    setFeatureInput('')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
    setFeatures([])
    setFeatureInput('')
  }

  const addFeature = () => {
    const value = featureInput.trim()
    if (!value || features.includes(value)) return
    setFeatures((prev) => [...prev, value])
    setFeatureInput('')
  }

  const removeFeature = (value: string) => {
    setFeatures((prev) => prev.filter((item) => item !== value))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || !form.price) {
      toast.error(t('common.required'))
      return
    }
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      price: Number(form.price) || 0,
      currency: form.currency,
      duration_days: Number(form.duration_days) || 0,
      features,
      is_first_month_free: form.is_first_month_free,
    }
    saveMutation.mutate({ id: editing?.id, body })
  }

  const plans = data ?? []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button leftIcon={<PlusIcon width={18} height={18} />} onClick={openCreate}>
          {t('premium.addPlan')}
        </Button>
      </div>

      {isError ? (
        <Card padded={false}>
          <ErrorState
            message={errorMessage(error)}
            onRetry={() => void refetch()}
            retryLabel={t('common.retry')}
          />
        </Card>
      ) : isLoading ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted">{t('common.loading')}</p>
        </Card>
      ) : plans.length === 0 ? (
        <Card padded={false}>
          <EmptyState title={t('common.noData')} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-soft text-warning">
                    <CrownIcon width={20} height={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy">{plan.name}</p>
                    <p className="text-xs text-muted">
                      {plan.duration_days} {t('premium.duration')}
                    </p>
                  </div>
                </div>
                {plan.is_first_month_free && (
                  <Badge variant="warning">{t('premium.firstMonthFree')}</Badge>
                )}
              </div>

              <p className="mt-4 text-2xl font-semibold text-navy">
                {formatPrice(plan.price, plan.currency)}
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {(plan.features ?? []).length === 0 ? (
                  <li className="text-xs text-muted">{t('premium.noFeatures')}</li>
                ) : (
                  plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-navy">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))
                )}
              </ul>

              <div className="mt-5 flex items-center justify-end gap-1.5 border-t border-line pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(plan)}
                  title={t('common.edit')}
                >
                  <EditIcon width={16} height={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => setPendingDelete(plan)}
                  title={t('common.delete')}
                >
                  <TrashIcon width={16} height={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? t('premium.editPlan') : t('premium.addPlan')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="plan-form"
              loading={saveMutation.isPending}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('premium.name')}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="1 oy"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label={t('premium.price')}
              type="number"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
            <Input
              label={t('premium.currency')}
              value={form.currency}
              onChange={(event) => setForm({ ...form, currency: event.target.value })}
            />
            <Input
              label={t('premium.duration')}
              type="number"
              value={form.duration_days}
              onChange={(event) =>
                setForm({ ...form, duration_days: event.target.value })
              }
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              {t('premium.features')}
            </label>
            <div className="flex gap-2">
              <input
                className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={featureInput}
                onChange={(event) => setFeatureInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addFeature()
                  }
                }}
                placeholder={t('premium.featurePlaceholder')}
              />
              <Button type="button" variant="secondary" onClick={addFeature}>
                {t('premium.addFeature')}
              </Button>
            </div>
            {features.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {features.map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
                  >
                    {feature}
                    <button
                      type="button"
                      onClick={() => removeFeature(feature)}
                      aria-label="remove"
                    >
                      <CloseIcon width={12} height={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary/30"
              checked={form.is_first_month_free}
              onChange={(event) =>
                setForm({ ...form, is_first_month_free: event.target.checked })
              }
            />
            {t('premium.firstMonthFree')}
          </label>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={t('common.delete')}
        message={t('premium.deleteConfirm')}
        loading={deleteMutation.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  )
}
