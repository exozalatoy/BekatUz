import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Lang } from './types'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export const TASHKENT = { lat: 41.311, lng: 69.24 }

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatPhone(value: string): string {
  let digits = onlyDigits(value)
  if (digits.startsWith('998')) digits = digits.slice(3)
  digits = digits.slice(0, 9)
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
  let out = '+998'
  if (parts[0]) out += ` (${parts[0]}`
  if (parts[0].length === 2) out += ')'
  if (parts[1]) out += ` ${parts[1]}`
  if (parts[2]) out += `-${parts[2]}`
  if (parts[3]) out += `-${parts[3]}`
  return out
}

export function toApiPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 12)
  return `+${digits}`
}

export function isPhoneComplete(value: string): boolean {
  return onlyDigits(value).replace(/^998/, '').length === 9
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + second).toUpperCase()
}

export function localeFor(lang: Lang): string {
  if (lang === 'ru') return 'ru-RU'
  if (lang === 'en') return 'en-US'
  return 'uz-UZ'
}

function safeFormat(iso: string, locale: string, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(locale, options).format(date)
  } catch {
    return new Intl.DateTimeFormat('en-US', options).format(date)
  }
}

export function formatDate(iso: string, lang: Lang): string {
  return safeFormat(iso, localeFor(lang), { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string, lang: Lang): string {
  return safeFormat(iso, localeFor(lang), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(iso: string, lang: Lang): string {
  const date = new Date(iso).getTime()
  if (Number.isNaN(date)) return ''
  const diff = Math.max(0, Date.now() - date)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const locale = localeFor(lang)
  if (minutes < 1) return lang === 'ru' ? 'только что' : lang === 'en' ? 'just now' : 'hozir'
  if (minutes < 60) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-minutes, 'minute')
  if (hours < 24) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-hours, 'hour')
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day')
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value)
}

export function formatSom(value: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(value))} so'm`
}

export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0
  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1
  const levels = ['', 'weak', 'fair', 'good', 'strong'] as const
  return { score: score as 0 | 1 | 2 | 3 | 4, label: levels[Math.min(score, 4)] ?? '' }
}

export function clampText(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}...`
}
