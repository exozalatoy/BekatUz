import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { SkeletonList } from '../../components/Skeleton'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/toast-context'
import {
  CopyIcon,
  CreditCardIcon,
  RefreshIcon,
  ShieldIcon,
  UploadIcon,
} from '../../components/icons'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { fileToCompressedDataUrl } from '../../lib/image'
import type { PremiumPlan, PremiumReceiptResponse, PremiumSubscribeResponse } from '../../lib/types'

interface PaymentInfo {
  card_number: string
  card_holder: string
}

export function Payments() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [receiptData, setReceiptData] = useState<string | null>(null)
  const [payment, setPayment] = useState<PaymentInfo | null>(null)
  const [sent, setSent] = useState(false)

  const plansQuery = useQuery({
    queryKey: ['premium-plans'],
    queryFn: () => api.get<{ items: PremiumPlan[] }>('/premium/plans'),
  })

  const paymentInfoQuery = useQuery({
    queryKey: ['payment-info'],
    queryFn: () => api.get<PaymentInfo>('/premium/payment-info'),
  })

  const plans = plansQuery.data?.items ?? []
  const selected = plans[0]?.id ?? null
  const plan = plans[0]

  const subscribeMutation = useMutation({
    mutationFn: () => api.post<PremiumSubscribeResponse>('/premium/subscribe', { plan_id: selected }),
    onSuccess: (response) => {
      setPayment({ card_number: response.card_number, card_holder: response.card_holder })
    },
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  const receiptMutation = useMutation({
    mutationFn: () =>
      api.post<PremiumReceiptResponse>('/premium/receipt', {
        payment_id: subscribeMutation.data?.payment_id,
        receipt_data: receiptData,
      }),
    onSuccess: () => setSent(true),
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  const cardNumber = payment?.card_number ?? paymentInfoQuery.data?.card_number
  const cardHolder = payment?.card_holder ?? paymentInfoQuery.data?.card_holder
  const busy = subscribeMutation.isPending || receiptMutation.isPending

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.show(t('premium.receiptMustBeImage'), 'error')
      return
    }
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      setReceiptData(dataUrl)
    } catch {
      toast.show(t('premium.receiptReadError'), 'error')
    }
  }

  const copyCard = async () => {
    if (!cardNumber) return
    try {
      await navigator.clipboard.writeText(cardNumber)
      toast.show(t('premium.copied'), 'success')
    } catch {
      toast.show(t('premium.copyFailed'), 'error')
    }
  }

  const submitReceipt = async () => {
    if (!receiptData || !selected) {
      toast.show(t('premium.noReceipt'), 'error')
      return
    }
    try {
      if (!subscribeMutation.data) {
        await subscribeMutation.mutateAsync()
      }
      receiptMutation.mutate()
    } catch {
      // xato toast onError orqali ko'rsatiladi
    }
  }

  if (sent) {
    return (
      <div className="pb-8">
        <TopBar title={t('payments.title')} onBack={() => navigate('/app/profile')} />
        <div className="flex flex-col items-center gap-4 px-6 pt-12 text-center">
          <div className="animate-pop-in flex h-24 w-24 items-center justify-center rounded-full bg-warning/15 text-warning">
            <ShieldIcon size={56} />
          </div>
          <h2 className="text-2xl font-bold text-text">{t('premium.reviewTitle')}</h2>
          <p className="text-sm text-muted">{t('premium.reviewText')}</p>
          <Button fullWidth className="mt-4" onClick={() => navigate('/app')}>
            {t('premium.backHome')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <TopBar title={t('payments.title')} onBack={() => navigate('/app/profile')} />

      {plansQuery.isPending ? (
        <div className="px-4 pt-4">
          <SkeletonList rows={2} />
        </div>
      ) : plansQuery.isError ? (
        <div className="p-4">
          <EmptyState
            icon={<RefreshIcon size={26} />}
            title={t('premium.plansError')}
            action={
              <Button size="sm" variant="secondary" onClick={() => plansQuery.refetch()}>
                {t('common.retry')}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4 pt-4">
          <Card>
            <p className="text-sm font-bold text-text">{plan?.name}</p>
            <p className="mt-0.5 text-xs text-muted">
              {plan ? t('premium.planDays', { count: plan.duration_days }) : ''}
            </p>
          </Card>

          <Card className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-text">
              <CreditCardIcon size={18} />
              {t('premium.cardTitle')}
            </p>
            <div className="rounded-card border border-border bg-surface-2 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted">{t('premium.cardNumber')}</p>
              <div className="mt-1 flex items-center gap-3">
                <p className="flex-1 text-lg font-bold tracking-wider text-text">{cardNumber}</p>
                <button
                  type="button"
                  onClick={copyCard}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent"
                  aria-label={t('premium.copy')}
                >
                  <CopyIcon size={18} />
                </button>
              </div>
              {cardHolder ? (
                <>
                  <p className="mt-3 text-[11px] uppercase tracking-wide text-muted">{t('premium.cardHolder')}</p>
                  <p className="mt-0.5 text-sm font-semibold text-text">{cardHolder}</p>
                </>
              ) : null}
            </div>
            {plan ? (
              <p className="text-sm text-muted">
                {t('premium.receiptHint', { amount: plan.price, currency: plan.currency })}
              </p>
            ) : null}
          </Card>

          <Card className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-text">{t('premium.receiptTitle')}</p>
            {receiptData ? (
              <div className="overflow-hidden rounded-card border border-border">
                <img src={receiptData} alt={t('premium.receiptTitle')} className="h-40 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-surface-2 py-2.5 text-center text-sm font-medium text-accent"
                >
                  {t('premium.replaceReceipt')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border bg-surface-2 px-4 py-6 text-center"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <UploadIcon size={22} />
                </span>
                <span className="text-sm font-medium text-text">{t('premium.chooseReceipt')}</span>
                <span className="text-xs text-muted">{t('premium.uploadHint')}</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void pickFile(event.target.files?.[0])}
            />
            <Button
              fullWidth
              size="lg"
              leftIcon={<UploadIcon size={18} />}
              loading={busy}
              disabled={!receiptData || selected === null}
              onClick={() => void submitReceipt()}
            >
              {t('premium.submitReceipt')}
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}