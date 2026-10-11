import { api } from './api'

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null
const installListeners = new Set<(event: BeforeInstallPromptEvent) => void>()

export function initInstallPromptCapture(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstallPrompt = event as BeforeInstallPromptEvent
    installListeners.forEach((listener) => listener(deferredInstallPrompt as BeforeInstallPromptEvent))
  })
}

export function onInstallAvailable(
  listener: (event: BeforeInstallPromptEvent) => void,
): () => void {
  if (deferredInstallPrompt) listener(deferredInstallPrompt)
  installListeners.add(listener)
  return () => {
    installListeners.delete(listener)
  }
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredInstallPrompt
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua)
}

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

export async function showSystemNotification(title: string, body: string, url = '/app'): Promise<void> {
  if (!notificationSupported() || Notification.permission !== 'granted') return
  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: `bekatuz-${url}`,
      data: { url },
    })
    return
  } catch {
    void 0
  }
  try {
    new Notification(title, { body, icon: '/icon.svg' })
  } catch {
    void 0
  }
}

let updateHandler: ((registration: ServiceWorkerRegistration) => void) | null = null

export function registerServiceWorker(
  onUpdate?: (registration: ServiceWorkerRegistration) => void,
): void {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }
  updateHandler = onUpdate ?? null
  navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        updateHandler?.(registration)
      }
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            updateHandler?.(registration)
          }
        })
      })
      window.setInterval(
        () => {
          registration.update().catch(() => void 0)
        },
        60 * 60 * 1000,
      )
    })
    .catch(() => void 0)
}

export async function enableWebPush(): Promise<boolean> {
  if (!notificationSupported()) return false
  const granted = await requestNotificationPermission()
  if (!granted) return false
  try {
    const keyResponse = await api.get<{ public_key: string; enabled: boolean }>('/push/public-key')
    if (!keyResponse.enabled || !keyResponse.public_key) return true
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyResponse.public_key) as BufferSource,
      })
    }
    const json = subscription.toJSON() as {
      endpoint?: string
      keys?: { p256dh?: string; auth?: string }
    }
    if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
      await api.post('/push/subscribe', {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      })
    }
    return true
  } catch {
    return true
  }
}

export function applyUpdate(registration: ServiceWorkerRegistration): void {
  const waiting = registration.waiting
  if (!waiting) {
    window.location.reload()
    return
  }
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
  waiting.postMessage({ type: 'SKIP_WAITING' })
}
