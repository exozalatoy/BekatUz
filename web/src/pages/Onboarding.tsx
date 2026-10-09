import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ArrowRightIcon, BusIcon, LocationIcon, ShieldIcon } from '../components/icons'
import { useAppStore } from '../store/app'
import { cn } from '../lib/utils'

function Slides() {
  return [
    <div
      key="1"
      className="relative h-full w-full overflow-hidden rounded-card border border-border bg-surface"
    >
      <div className="absolute -left-8 top-8 h-40 w-40 rounded-full bg-accent-soft" />
      <div className="absolute bottom-6 right-6 h-28 w-28 rounded-full bg-accent-soft" />
      <div className="flex h-full items-center justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-accent text-white shadow-[0_16px_40px_rgba(47,107,255,0.45)]">
          <BusIcon size={52} />
        </div>
      </div>
    </div>,
    <div
      key="2"
      className="relative h-full w-full overflow-hidden rounded-card border border-border bg-surface"
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(var(--c-border) 1px, transparent 1px), linear-gradient(90deg, var(--c-border) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute left-1/3 top-1/3 flex h-14 w-14 items-center justify-center rounded-full bg-danger/15 text-danger">
        <LocationIcon size={28} />
      </div>
      <div className="absolute bottom-1/3 right-1/4">
        <span className="absolute inline-flex h-12 w-12 animate-ping rounded-full bg-accent/40" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white">
          <BusIcon size={26} />
        </span>
      </div>
    </div>,
    <div
      key="3"
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-card border border-border bg-surface"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(245,158,11,0.22), transparent 65%)',
        }}
      />
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-warning/15 text-warning">
        <ShieldIcon size={52} />
      </div>
    </div>,
  ]
}

export function Onboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setOnboardingSeen = useAppStore((state) => state.setOnboardingSeen)
  const [index, setIndex] = useState(0)
  const [touchX, setTouchX] = useState<number | null>(null)

  const slides = Slides()
  const total = slides.length
  const isLast = index === total - 1

  const finish = () => {
    setOnboardingSeen()
    navigate('/auth/login', { replace: true })
  }

  const next = () => {
    if (isLast) finish()
    else setIndex((value) => value + 1)
  }

  const onTouchEnd = (endX: number) => {
    if (touchX === null) return
    const delta = endX - touchX
    if (delta < -40 && index < total - 1) setIndex((value) => value + 1)
    if (delta > 40 && index > 0) setIndex((value) => value - 1)
    setTouchX(null)
  }

  return (
    <div className="shell">
      <div className="flex items-center justify-between px-6 pt-6">
        <span className="text-sm font-bold text-text">
          Bekat <span className="text-accent">Uz</span>
        </span>
        <button type="button" onClick={finish} className="text-sm font-medium text-muted">
          {t('common.skip')}
        </button>
      </div>

      <div
        className="flex flex-1 flex-col px-6"
        onTouchStart={(event) => setTouchX(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => onTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      >
        <div className="mt-6 h-64 w-full">{slides[index]}</div>
        <div className="mt-10 text-center">
          <h2 className="text-2xl font-bold text-text">{t(`onboarding.${['slide1Title', 'slide2Title', 'slide3Title'][index]}`)}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {t(`onboarding.${['slide1Text', 'slide2Text', 'slide3Text'][index]}`)}
          </p>
        </div>
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: total }).map((_, dot) => (
            <span
              key={dot}
              className={cn(
                'h-2 rounded-full transition-all',
                dot === index ? 'w-6 bg-accent' : 'w-2 bg-border',
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 px-6 pb-10">
        <Button variant="secondary" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>
          {t('common.back')}
        </Button>
        <Button fullWidth rightIcon={isLast ? undefined : <ArrowRightIcon size={18} />} onClick={next}>
          {isLast ? t('common.start') : t('common.next')}
        </Button>
      </div>
    </div>
  )
}
