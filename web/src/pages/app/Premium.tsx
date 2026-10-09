import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { Segmented } from '../../components/Segmented'
import { SkeletonList } from '../../components/Skeleton'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/toast-context'
import { CheckCircleIcon, CheckIcon, CrownIcon, RefreshIcon, ShieldIcon, StarIcon } from '../../components/icons'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'
import type { Lang, PremiumConfirmResponse, PremiumPlan, PremiumSubscribeResponse } from '../../lib/types'

type Step = 'plans' | 'pending' | 'success'
type Provider = 'payme' | 'click'

export function Premium() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const lang = i18n.language as Lang
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const [step, setStep] = useState<Step>('plans')
  const [selectedState, setSelectedState] = useState<number | null>(null)
  const [provider, setProvider] = useState<Provider>('payme')
  const [paymentId, setPaymentId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const plansQuery = useQuery({
    queryKey: ['premium-plans'],
    queryFn: () => api.get<{ items: PremiumPlan[] }>('/premium/plans'),
  })

  const plans = plansQuery.data?.items ?? []
  const selected = selectedState ?? plans[0]?.id ?? null

  const subscribeMutation = useMutation({
    mutationFn: () =>
      api.post<PremiumSubscribeResponse>('/premium/subscribe', { plan_id: selected, provider }),
    onSuccess: (response) => {
      setPaymentId(response.payment_id)
      setStep('pending')
    },
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  const confirmMutation = useMutation({
    mutationFn: () => api.post<PremiumConfirmResponse>('/premium/confirm', { payment_id: paymentId }),
    onSuccess: (response) => {
      setExpiresAt(response.expires_at)
      if (user) setUser({ ...user, is_premium: true })
      setStep('success')
    },
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  const benefits = [
    t('premium.benefit1'),
    t('premium.benefit2'),
    t('premium.benefit3'),
    t('premium.benefit4'),
  ]

  return (
    <div className="pb-8">
      <TopBar title={t('premium.title')} onBack={() => navigate('/app/profile')} />

      {step === 'success' ? (
        <div className="flex flex-col items-center gap-4 px-6 pt-12 text-center">
          <div className="animate-pop-in flex h-24 w-24 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircleIcon size={56} />
          </div>
          <h2 className="text-2xl font-bold text-text">{t('premium.successTitle')}</h2>
          <p className="text-sm text-muted">{t('premium.successText')}</p>
          {expiresAt ? (
            <p className="text-xs text-muted">{t('premium.activeUntil', { date: formatDate(expiresAt, lang) })}</p>
          ) : null}
          <Button fullWidth className="mt-4" onClick={() => navigate('/app')}>
            {t('premium.backHome')}
          </Button>
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

          {step === 'pending' ? (
            <Card className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/15 text-warning">
                <ShieldIcon size={28} />
              </span>
              <p className="text-base font-bold text-text">{t('premium.pendingTitle')}</p>
              <p className="text-sm text-muted">{t('premium.pendingText')}</p>
              <Button fullWidth loading={confirmMutation.isPending} onClick={() => confirmMutation.mutate()}>
                {t('premium.confirmPayment')}
              </Button>
              <button
                type="button"
                onClick={() => setStep('plans')}
                className="text-sm font-medium text-accent"
              >
                {t('common.back')}
              </button>
            </Card>
          ) : (
            <>
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

              <div>
                <p className="px-1 pb-2 text-sm font-semibold text-text">{t('premium.provider')}</p>
                <Segmented<Provider>
                  options={[
                    { value: 'payme', label: t('premium.payme') },
                    { value: 'click', label: t('premium.click') },
                  ]}
                  value={provider}
                  onChange={setProvider}
                />
              </div>

              <Button
                fullWidth
                size="lg"
                leftIcon={<StarIcon size={18} />}
                loading={subscribeMutation.isPending}
                disabled={selected === null}
                onClick={() => subscribeMutation.mutate()}
              >
                {t('premium.subscribe')}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
