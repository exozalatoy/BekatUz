import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { MapCanvas } from '../../components/MapCanvas'
import { ReviewSheet, type ReviewDriver } from '../../components/ReviewSheet'
import { Skeleton } from '../../components/Skeleton'
import { TopBar } from '../../components/TopBar'
import { BusIcon, ClockIcon, LocationIcon, StarIcon } from '../../components/icons'
import { api } from '../../lib/api'
import { formatSom } from '../../lib/utils'
import type { RouteDetail as RouteDetailData, VehicleOut } from '../../lib/types'

export function RouteDetail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const routeId = Number(id)

  const [mapReady, setMapReady] = useState(false)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const markersRef = useRef<Map<number, Marker>>(new Map())
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewDrivers, setReviewDrivers] = useState<ReviewDriver[]>([])

  const query = useQuery({
    queryKey: ['route', id],
    queryFn: () => api.get<RouteDetailData>(`/routes/${id}`),
    enabled: Number.isFinite(routeId),
  })

  const vehiclesQuery = useQuery({
    queryKey: ['route-vehicles', id],
    queryFn: () => api.get<{ items: VehicleOut[] }>('/vehicles', { route_id: routeId }),
    enabled: Number.isFinite(routeId),
    refetchInterval: 5000,
  })

  const center = useMemo<[number, number]>(() => {
    const first = query.data?.stops[0]
    return [first?.lng ?? 69.24, first?.lat ?? 41.311]
  }, [query.data])

  const handleReady = useCallback((instance: MapLibreMap) => {
    setMap(instance)
    setMapReady(true)
  }, [])

  useEffect(() => {
    if (!mapReady || !map) return
    const route = query.data
    if (!route || route.stops.length === 0) return
    const coords = route.stops.map((stop) => [stop.lng, stop.lat] as [number, number])

    if (map.getLayer('rd-line')) map.removeLayer('rd-line')
    if (map.getSource('rd-line')) map.removeSource('rd-line')
    map.addSource('rd-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      },
    })
    map.addLayer({
      id: 'rd-line',
      type: 'line',
      source: 'rd-line',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': route.color, 'line-width': 4, 'line-opacity': 0.9 },
    })

    const lngs = coords.map(([lng]) => lng)
    const lats = coords.map(([, lat]) => lat)
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 40, duration: 0 },
    )
  }, [mapReady, map, query.data])

  useEffect(() => {
    if (!mapReady || !map) return
    const items = vehiclesQuery.data?.items ?? []
    const seen = new Set<number>()
    items.forEach((vehicle) => {
      seen.add(vehicle.id)
      let marker = markersRef.current.get(vehicle.id)
      if (!marker) {
        const element = document.createElement('div')
        element.className = 'map-vehicle-marker'
        element.style.setProperty('--marker-color', vehicle.route?.color ?? '#2f6bff')
        element.innerHTML =
          '<span class="map-vehicle-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11"/><path d="M4 11h16"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/></svg></span>'
        marker = new Marker({ element, rotationAlignment: 'map' })
          .setLngLat([vehicle.lng, vehicle.lat])
          .addTo(map)
        markersRef.current.set(vehicle.id, marker)
      }
      marker.setLngLat([vehicle.lng, vehicle.lat])
      marker.setRotation(vehicle.bearing ?? 0)
    })
    markersRef.current.forEach((marker, vid) => {
      if (!seen.has(vid)) {
        marker.remove()
        markersRef.current.delete(vid)
      }
    })
  }, [mapReady, map, vehiclesQuery.data])

  useEffect(() => {
    const markers = markersRef.current
    return () => {
      markers.forEach((marker) => marker.remove())
      markers.clear()
    }
  }, [])

  const openReview = (driverId: number, label: string) => {
    setReviewDrivers([{ id: driverId, label }])
    setReviewOpen(true)
  }

  if (query.isPending) {
    return (
      <div className="pb-8">
        <TopBar title={t('route.title')} onBack={() => navigate(-1)} />
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="pb-8">
        <TopBar title={t('route.title')} onBack={() => navigate(-1)} />
        <EmptyState
          icon={<BusIcon size={28} />}
          title={t('route.notFound')}
          action={
            <Button size="sm" variant="secondary" onClick={() => query.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      </div>
    )
  }

  const route = query.data
  const typeLabel = t(`route.type${route.type.charAt(0).toUpperCase()}${route.type.slice(1)}`)
  const vehicles = vehiclesQuery.data?.items ?? []

  return (
    <div className="pb-8">
      <TopBar title={route.name} onBack={() => navigate(-1)} />

      <div
        className="px-4 pb-5 pt-5"
        style={{ background: `linear-gradient(135deg, ${route.color}, ${route.color}b3)` }}
      >
        <div className="flex items-center gap-2">
          <Badge className="bg-white/20 text-white">{typeLabel}</Badge>
          <span className="text-xs font-semibold text-white/80">{route.city}</span>
        </div>
        <h1 className="mt-2 text-xl font-extrabold text-white">{route.name}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/90">
          <LocationIcon size={16} />
          {route.from_name} → {route.to_name}
        </p>
      </div>

      <div className="px-4 pt-4">
        <Card className="grid grid-cols-3 divide-x divide-border text-center">
          <div>
            <p className="text-sm font-bold text-text">{route.first_time}</p>
            <p className="text-xs text-muted">{t('route.firstTime')}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-text">{route.last_time}</p>
            <p className="text-xs text-muted">{t('route.lastTime')}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-text">{route.interval_min} daq</p>
            <p className="text-xs text-muted">{t('route.interval')}</p>
          </div>
        </Card>

        <div className="mt-3 flex items-center justify-between rounded-card border border-border bg-surface p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-text">
            <ClockIcon size={18} className="text-accent" />
            {t('route.price')}
          </span>
          <span className="text-base font-extrabold text-accent">{formatSom(route.price)}</span>
        </div>

        <div className="mt-4 h-52 overflow-hidden rounded-card border border-border">
          <MapCanvas center={center} zoom={12} onReady={handleReady} />
        </div>

        <h2 className="mt-5 text-base font-bold text-text">
          {t('route.stops')}
          <span className="ml-2 text-xs font-medium text-muted">
            {t('route.stopsCount', { count: route.stops.length })}
          </span>
        </h2>
        <div className="mt-3 pl-1">
          {route.stops.map((stop, index) => (
            <div key={stop.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full ring-4"
                  style={{ background: route.color, boxShadow: `0 0 0 4px ${route.color}22` }}
                />
                {index < route.stops.length - 1 ? (
                  <span className="w-0.5 flex-1 bg-border" />
                ) : null}
              </div>
              <p className="pb-4 text-sm text-text">{stop.name}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-2 text-base font-bold text-text">{t('route.liveVehicles')}</h2>
        <div className="mt-3 flex flex-col gap-3">
          {vehicles.length === 0 ? (
            <EmptyState icon={<BusIcon size={26} />} title={t('route.noVehicles')} />
          ) : (
            vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-btn text-white"
                  style={{ background: route.color }}
                >
                  <BusIcon size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text">{vehicle.plate}</p>
                  <p className="truncate text-xs text-muted">
                    {vehicle.status === 'moving' ? t('map.live') : t('map.offline')} ·{' '}
                    {vehicle.seats_free}/{vehicle.seats_total} {t('map.seatsFree')}
                  </p>
                </div>
                {vehicle.driver_id ? (
                  <button
                    type="button"
                    aria-label={t('route.reviewDriver')}
                    onClick={() => openReview(vehicle.driver_id as number, vehicle.plate)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/15 text-warning"
                  >
                    <StarIcon size={18} />
                  </button>
                ) : null}
              </Card>
            ))
          )}
        </div>
      </div>

      <ReviewSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        drivers={reviewDrivers}
        initialDriverId={reviewDrivers[0]?.id}
      />
    </div>
  )
}
