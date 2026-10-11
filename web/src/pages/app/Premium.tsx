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
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
  CrownIcon,
  RefreshIcon,
  ShieldIcon,
  UploadIcon,
} from '../../components/icons'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { fileToCompressedDataUrl } from '../../lib/image'
import type { PremiumPlan, PremiumReceiptResponse, PremiumSubscribeResponse } from '../../lib/types'

type Step = 'plans' | 'pay' | 'review'

interface PaymentInfo {
  paymentId: string
  amount: number
  currency: string
  cardNumber: string
  cardHolder: string
}

export function Premium() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('plans')
  const [selectedState, setSelectedState] = useState<number | null>(null)
  const [payment, setPayment] = useState<PaymentInfo | null>(null)
  const [receiptData, setReceiptData] = useState<string | null>(null)

  const plansQuery = useQuery({
    queryKey: ['premium-plans'],
    queryFn: () => api.get<{ items: PremiumPlan[] }>('/premium/plans'),
  })

  const plans = plansQuery.data?.items ?? []
  const selected = selectedState ?? plans[0]?.id ?? null

  const subscribeMutation = useMutation({
    mutationFn: () => api.post<PremiumSubscribeResponse>('/premium/subscribe', { plan_id: selected }),
    onSuccess: (response) => {
      setPayment({
        paymentId: response.payment_id,
        amount: response.amount,
        currency: response.currency,
        cardNumber: response.card_number,
        cardHolder: response.card_holder,
      })
      setStep('pay')
    },
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  const receiptMutation = useMutation({
    mutationFn: () =>
      api.post<PremiumReceiptResponse>('/premium/receipt', {
        payment_id: payment?.paymentId,
        receipt_data: receiptData,
      }),
    onSuccess: () => {
      setStep('review')
    },
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

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
    if (!payment) return
    try {
      await navigator.clipboard.writeText(payment.cardNumber)
      toast.show(t('premium.copied'), 'success')
    } catch {
      toast.show(t('premium.copyFailed'), 'error')
    }
  }

  const submitReceipt = () => {
    if (!receiptData) {
      toast.show(t('premium.noReceipt'), 'error')
      return
    }
    receiptMutation.mutate()
  }

  const resetPayment = () => {
    setPayment(null)
    setReceiptData(null)
    setStep('plans')
  }

  const benefits = [
    t('premium.benefit1'),
    t('premium.benefit2'),
    t('premium.benefit3'),
    t('premium.benefit4'),
  ]

  return (
    <div className="pb-8">
      <TopBar title={t('premium.title')} onBack={() => navigate('/app/profile')} />

      {step === 'review' ? (
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
      ) : step === 'pay' && payment ? (
        <div className="flex flex-col gap-4 px-4 pt-4">
          <Card className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success/15 text-success">
              <CreditCardIcon size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">{t('premium.amount')}</p>
              <p className="text-xl font-extrabold text-text">
                {payment.amount} {payment.currency}
              </p>
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-text">
              <CreditCardIcon size={18} />
              {t('premium.cardTitle')}
            </p>
            <div className="rounded-card border border-border bg-surface-2 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted">{t('premium.cardNumber')}</p>
              <div className="mt-1 flex items-center gap-3">
                <p className="flex-1 text-lg font-bold tracking-wider text-text">{payment.cardNumber}</p>
                <button
                  type="button"
                  onClick={copyCard}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent"
                  aria-label={t('premium.copy')}
                >
                  <CopyIcon size={18} />
                </button>
              </div>
              {payment.cardHolder ? (
                <>
                  <p className="mt-3 text-[11px] uppercase tracking-wide text-muted">{t('premium.cardHolder')}</p>
                  <p className="mt-0.5 text-sm font-semibold text-text">{payment.cardHolder}</p>
                </>
              ) : null}
            </div>
            <p className="text-sm text-muted">{t('premium.receiptHint', { amount: payment.amount, currency: payment.currency })}</p>
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
              loading={receiptMutation.isPending}
              disabled={!receiptData}
              onClick={submitReceipt}
            >
              {t('premium.submitReceipt')}
            </Button>
            <button type="button" onClick={resetPayment} className="text-center text-sm font-medium text-accent">
              {t('premium.backToPlans')}
            </button>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4 pt-4">
          <Card className="relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-90"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#b45309)' }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 text-white">
                <CrownIcon size={22} />
                <span className="text-lg font-extrabold">Bekat Premium</span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-white">{t('premium.perMonth')}</p>
              <span className="mt-2 inline-block rounded-full bg-black/25 px-3 py-1 text-xs font-bold text-white">
                {t('premium.firstFree')}
              </span>
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckIcon size={16} />
                </span>
                <span className="text-sm text-text">{benefit}</span>
              </div>
            ))}
          </Card>

          <div>
            <p className="px-1 pb-2 text-sm font-semibold text-text">{t('premium.choosePlan')}</p>
            {plansQuery.isPending ? (
              <SkeletonList rows={2} />
            ) : plansQuery.isError ? (
              <EmptyState
                icon={<RefreshIcon size={26} />}
                title={t('premium.plansError')}
                action={
                  <Button size="sm" variant="secondary" onClick={() => plansQuery.refetch()}>
                    {t('common.retry')}
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedState(plan.id)}
                    className={`flex items-center gap-3 rounded-card border bg-surface p-4 text-left transition ${
                      selected === plan.id ? 'border-accent' : 'border-border'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        selected === plan.id ? 'border-accent bg-accent text-white' : 'border-border'
                      }`}
                    >
                      {selected === plan.id ? <CheckIcon size={12} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-text">{plan.name}</span>
                      <span className="block text-xs text-muted">
                        {t('premium.planDays', { count: plan.duration_days })}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-accent">
                      {plan.price} {plan.currency}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            fullWidth
            size="lg"
            leftIcon={<CreditCardIcon size={18} />}
            loading={subscribeMutation.isPending}
            disabled={selected === null}
            onClick={() => subscribeMutation.mutate()}
          >
            {t('premium.payByCard')}
          </Button>
        </div>
      )}
    </div>
  )
}