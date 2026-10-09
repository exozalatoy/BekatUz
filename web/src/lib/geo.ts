import type { RouteType } from './types'

const EARTH_RADIUS_KM = 6371
const DEFAULT_SPEED_KMH = 22

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function etaMinutes(distanceKm: number, speedKmh = DEFAULT_SPEED_KMH): number {
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60))
}

export function bearingBetween(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export const ROUTE_TYPE_COLORS: Record<RouteType, string> = {
  bus: '#2563eb',
  minibus: '#16a34a',
  taxi: '#f59e0b',
  train: '#dc2626',
}
