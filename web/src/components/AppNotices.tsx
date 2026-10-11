import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { CloseIcon, DownloadIcon, RefreshIcon } from './icons'
import { useToast } from './toast-context'
import { api } from '../lib/api'
import {
  applyUpdate,
  enableWebPush,
  isIos,
  isStandalone,
  notificationPermission,
  notificationSupported,
  onInstallAvailable,
  registerServiceWorker,
  showSystemNotification,
  type BeforeInstallPromptEvent,
} from '../lib/pwa'
import { useAuthStore } from '../store/auth'
import type { NotificationOut } from '../lib/types'

const INSTALL_KEY = 'bekat-install-dismissed'
const NOTIF_PROMPT_KEY = 'bekat-notif-prompt-dismissed'
const SEEN_KEY = 'bekat-notif-seen-id'

function recentlyDismissed(key: string, days: number): boolean {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return false
    return Date.now() - Number(raw) < days * 86_400_000
  } catch {
    return false
  }
}

function rememberDismiss(key: string): void {
  try {
    window.localStorage.setItem(key, String(Date.now()))
  } catch {
    void 0
  }
}

function setSeen(id: number): void {
  try {
    window.localStorage.setItem(SEEN_KEY, String(id))
  } catch {
    void 0
  }
}

function getSeen(): number {
  try {
    return Number(window.localStorage.getItem(SEEN_KEY)) || 0
  } catch {
    return 0
  }
}

export function AppNotices() {
  const { t } = useTranslation()
  const toast = useToast()
  const accessToken = useAuthStore((state) => state.accessToken)

  const [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null)
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [iosInstall, setIosInstall] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    notificationSupported() ? Notification.permission : 'unsupported',
  )
  const [promptDismissed, setPromptDismissed] = useState(() => recentlyDismissed(NOTIF_PROMPT_KEY, 3))

  useEffect(() => {
    registerServiceWorker((registration) => setUpdate(registration))
  }, [])

  useEffect(() => {
    if (isStandalone() || recentlyDismissed(INSTALL_KEY, 7)) return
    if (isIos()) {
      setIosInstall(true)
      setShowInstall(true)
      return
    }
    return onInstallAvailable((event) => {
      setPromptEvent(event)
      setShowInstall(true)
    })
  }, [])

  useEffect(() => {
    if (!accessToken) return
    let active = true
    const poll = async () => {
      try {
        const data = await api.get<{ items: NotificationOut[] }>('/notifications')
        if (!active) return
        const items = data.items ?? []
        const seen = getSeen()
        if (seen === 0) {
          if (items.length) setSeen(items[0].id)
          return
        }
        const fresh = items.filter((item) => item.id > seen).sort((a, b) => a.id - b.id)
        if (fresh.length) {
          setSeen(fresh[fresh.length - 1].id)
          if (document.hidden && notificationPermission() === 'granted') {
            for (const item of fresh) {
              void showSystemNotification(item.title, item.body, '/app')
            }
          }
        }
      } catch {
        void 0
      }
    }
    void poll()
    const timer = window.setInterval(poll, 30000)
    const onFocus = () => {
      if (!document.hidden) void poll()
    }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [accessToken])

  const dismissInstall = useCallback(() => {
    rememberDismiss(INSTALL_KEY)
    setShowInstall(false)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!promptEvent) return
    try {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      if (choice.outcome === 'accepted') rememberDismiss(INSTALL_KEY)
    } catch {
      void 0
    }
    setPromptEvent(null)
    setShowInstall(false)
  }, [promptEvent])

  useEffect(() => {
    if (!accessToken) return
    if (notificationSupported() && Notification.permission === 'granted') {
      void enableWebPush()
    }
  }, [accessToken])

  const handleEnableNotifications = useCallback(async () => {
    const granted = await enableWebPush()
    setPermission(notificationSupported() ? Notification.permission : 'unsupported')
    if (granted) {
      toast.show(t('pwa.notifOn'), 'success')
    } else {
      toast.show(t('pwa.notifBlocked'), 'error')
    }
    rememberDismiss(NOTIF_PROMPT_KEY)
    setPromptDismissed(true)
  }, [t, toast])

  const showNotifPrompt =
    Boolean(accessToken) &&
    notificationSupported() &&
    permission === 'default' &&
    !promptDismissed

  return (
    <>
      {update ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[65] w-full max-w-[480px] -translate-x-1/2 px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-btn border border-accent/40 bg-surface px-4 py-3 shadow-lg">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <RefreshIcon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text">{t('pwa.updateTitle')}</p>
              <p className="truncate text-xs text-muted">{t('pwa.updateText')}</p>
            </div>
            <Button size="sm" onClick={() => applyUpdate(update)}>
              {t('pwa.update')}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none fixed bottom-20 left-1/2 z-[60] flex w-full max-w-[480px] -translate-x-1/2 flex-col gap-2 px-4">
        {showInstall ? (
          <div className="pointer-events-auto flex items-start gap-3 rounded-btn border border-border bg-surface px-4 py-3 shadow-lg">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <DownloadIcon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text">{t('pwa.installTitle')}</p>
              <p className="text-xs text-muted">
                {iosInstall ? t('pwa.installIosText') : t('pwa.installText')}
              </p>
              {!iosInstall ? (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={handleInstall}>
                    {t('pwa.install')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissInstall}>
                    {t('common.close')}
                  </Button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={dismissInstall}
              aria-label={t('common.close')}
              className="shrink-0 text-muted transition hover:text-text"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        ) : showNotifPrompt ? (
          <div className="pointer-events-auto flex items-center gap-3 rounded-btn border border-border bg-surface px-4 py-3 shadow-lg">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text">{t('pwa.notifTitle')}</p>
              <p className="text-xs text-muted">{t('pwa.notifText')}</p>
            </div>
            <Button size="sm" onClick={handleEnableNotifications}>
              {t('pwa.notifEnable')}
            </Button>
            <button
              type="button"
              onClick={() => {
                rememberDismiss(NOTIF_PROMPT_KEY)
                setPromptDismissed(true)
              }}
              aria-label={t('common.close')}
              className="shrink-0 text-muted transition hover:text-text"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        ) : null}
      </div>
    </>
  )
}
