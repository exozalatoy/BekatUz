import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LngLatBounds, Marker, Popup, type Map as MapLibreMap } from 'maplibre-gl'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { MapCanvas } from '../../components/MapCanvas'
import { ReviewSheet, type ReviewDriver } from '../../components/ReviewSheet'
import { Segmented } from '../../components/Segmented'
import { Sheet } from '../../components/Sheet'
import { BusIcon, LocationIcon } from '../../components/icons'
import { api } from '../../lib/api'
import { etaMinutes, haversineKm } from '../../lib/geo'
import { WSClient, type WSStatus } from '../../lib/ws'
import { TASHKENT, cn } from '../../lib/utils'
import type {
  RouteOut,
  RouteType,
  VehicleLite,
  VehicleOut,
  VehiclesMessage,
} from '../../lib/types'

const BUS_SVG =
  '<span class="map-vehicle-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11"/><path d="M4 11h16"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/></svg></span>'

const MAP_CENTER: [number, number] = [TASHKENT.lng, TASHKENT.lat]

type ViewMode = '2d' | '3d'
type FilterValue = RouteType | 'all'

type MarkerEntry = {
  marker: Marker
  element: HTMLDivElement
  routeId: number | null
}

export function MapView() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [mapReady, setMapReady] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('2d')
  const [filter, setFilter] = useState<FilterValue>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [wsStatus, setWsStatus] = useState<WSStatus>('connecting')
  const [sheetVehicle, setSheetVehicle] = useState<VehicleOut | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Map<number, MarkerEntry>>(new Map())
  const positionsRef = useRef<Map<number, VehicleLite>>(new Map())
  const routesRef = useRef<Map<number, RouteOut>>(new Map())
  const filterRef = useRef<FilterValue>('all')
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const userMarkerRef = useRef<Marker | null>(null)

  const routesQuery = useQuery({
    queryKey: ['routes', ''],
    queryFn: () => api.get<{ items: RouteOut[] }>('/routes'),
  })

  const vehicleDetail = useQuery({
    queryKey: ['vehicle', sheetVehicle?.id],
    queryFn: () => api.get<VehicleOut>(`/vehicles/${sheetVehicle?.id}`),
    enabled: Boolean(sheetVehicle?.id),
  })

  const reviewDrivers: ReviewDriver[] =
    sheetVehicle?.driver_id != null
      ? [
          {
            id: sheetVehicle.driver_id,
            label: sheetVehicle.route?.name ?? t('map.driver'),
            sub: sheetVehicle.plate,
          },
        ]
      : []

  const applyFilter = useCallback(() => {
    const value = filterRef.current
    markersRef.current.forEach((entry) => {
      const type = entry.routeId != null ? routesRef.current.get(entry.routeId)?.type : undefined
      const visible = value === 'all' || type === value
      entry.element.style.display = visible ? '' : 'none'
    })
  }, [])

  const selectVehicle = useCallback(async (id: number) => {
    try {
      const vehicle = await api.get<VehicleOut>(`/vehicles/${id}`)
      setSheetVehicle(vehicle)
      if (vehicle.route_id != null) setSelectedRouteId(vehicle.route_id)
    } catch {
      void 0
    }
  }, [])

  const syncMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const seen = new Set<number>()
    positionsRef.current.forEach((vehicle, id) => {
      seen.add(id)
      let entry = markersRef.current.get(id)
      if (!entry) {
        const element = document.createElement('div')
        element.className = 'map-vehicle-marker'
        element.innerHTML = BUS_SVG
        element.style.setProperty('--marker-color', '#2f6bff')
        element.addEventListener('click', () => {
          void selectVehicle(id)
        })
        const marker = new Marker({ element, rotationAlignment: 'map' })
          .setLngLat([vehicle.lng, vehicle.lat])
          .addTo(map)
        entry = { marker, element, routeId: vehicle.route_id }
        markersRef.current.set(id, entry)
      }
      entry.marker.setLngLat([vehicle.lng, vehicle.lat])
      entry.marker.setRotation(vehicle.bearing || 0)
      entry.routeId = vehicle.route_id
      const color = vehicle.route_id != null ? routesRef.current.get(vehicle.route_id)?.color : undefined
      entry.element.style.setProperty('--marker-color', color ?? '#2f6bff')
    })
    markersRef.current.forEach((entry, id) => {
      if (!seen.has(id)) {
        entry.marker.remove()
        markersRef.current.delete(id)
      }
    })
    applyFilter()
  }, [applyFilter, selectVehicle])

  const handleReady = useCallback((map: MapLibreMap) => {
    mapRef.current = map
    markersRef.current = new Map()
    userMarkerRef.current = null
    map.on('click', 'rd-stops', (event) => {
      const feature = event.features?.[0]
      if (!feature) return
      const name = String(feature.properties?.name ?? '')
      if (!name) return
      new Popup({ closeButton: false }).setLngLat(event.lngLat).setText(name).addTo(map)
    })
    map.on('mouseenter', 'rd-stops', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'rd-stops', () => {
      map.getCanvas().style.cursor = ''
    })
    setMapReady(true)
  }, [])

  useEffect(() => {
    filterRef.current = filter
    applyFilter()
  }, [filter, applyFilter])

  useEffect(() => {
    const data = routesQuery.data?.items
    if (!data) return
    data.forEach((route) => routesRef.current.set(route.id, route))
    syncMarkers()
  }, [routesQuery.data, syncMarkers])

  useEffect(() => {
    const client = new WSClient('/ws/vehicles')
    client.onStatus = (status) => setWsStatus(status)
    client.onMessage = (raw) => {
      const message = raw as Partial<VehiclesMessage> | null
      if (!message || message.type !== 'vehicles' || !Array.isArray(message.data)) return
      const next = new Map<number, VehicleLite>()
      message.data.forEach((vehicle) => next.set(vehicle.id, vehicle))
      positionsRef.current = next
      syncMarkers()
    }
    client.connect()
    return () => client.close()
  }, [syncMarkers])

  useEffect(() => {
    if (wsStatus === 'open') return
    const poll = async () => {
      try {
        const response = await api.get<{ items: VehicleOut[] }>('/vehicles')
        const next = new Map<number, VehicleLite>()
        response.items.forEach((vehicle) =>
          next.set(vehicle.id, {
            id: vehicle.id,
            route_id: vehicle.route_id,
            lat: vehicle.lat,
            lng: vehicle.lng,
            speed: vehicle.speed,
            bearing: vehicle.bearing,
            status: vehicle.status,
            updated_at: vehicle.updated_at,
          }),
        )
        positionsRef.current = next
          syncMarkers()
      } catch {
        void 0
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 10000)
    return () => window.clearInterval(timer)
  }, [wsStatus, syncMarkers])

  const placeUser = useCallback((coords: { lat: number; lng: number } | null) => {
    const map = mapRef.current
    if (!map || !coords) return
    if (!userMarkerRef.current) {
      const element = document.createElement('div')
      element.className = 'map-user-marker'
      element.innerHTML = '<span class="map-user-dot"></span>'
      userMarkerRef.current = new Marker({ element })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map)
    } else {
      userMarkerRef.current.setLngLat([coords.lng, coords.lat])
    }
  }, [])

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserCoords(coords)
        placeUser(coords)
        mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 14 })
      },
      () => void 0,
      { timeout: 6000, enableHighAccuracy: true },
    )
  }, [placeUser])

  useEffect(() => {
    if (mapReady) placeUser(userCoords)
  }, [mapReady, userCoords, placeUser])

  const recenter = useCallback(() => {
    if (userCoords) {
      mapRef.current?.flyTo({
        center: [userCoords.lng, userCoords.lat],
        zoom: 15,
        pitch: viewMode === '3d' ? 60 : 0,
      })
      return
    }
    if (!('geolocation' in navigator)) {
      mapRef.current?.flyTo({ center: [TASHKENT.lng, TASHKENT.lat], zoom: 13 })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserCoords(next)
        placeUser(next)
        mapRef.current?.flyTo({ center: [next.lng, next.lat], zoom: 15 })
      },
      () => mapRef.current?.flyTo({ center: [TASHKENT.lng, TASHKENT.lat], zoom: 13 }),
      { timeout: 6000 },
    )
  }, [placeUser, userCoords, viewMode])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    map.easeTo({ pitch: viewMode === '3d' ? 60 : 0, duration: 500 })
  }, [viewMode, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || selectedRouteId == null) return
    let cancelled = false
    const draw = async () => {
      try {
        const route = await api.get<{
          color: string
          stops: { id: number; name: string; lat: number; lng: number }[]
        }>(`/routes/${selectedRouteId}`)
        if (cancelled) return
        if (map.getLayer('rd-line')) map.removeLayer('rd-line')
        if (map.getLayer('rd-stops')) map.removeLayer('rd-stops')
        if (map.getSource('rd-line')) map.removeSource('rd-line')
        if (route.stops.length < 2) return
        const coords = route.stops.map((stop) => [stop.lng, stop.lat] as [number, number])
        map.addSource('rd-line', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: coords },
              },
              ...route.stops.map((stop) => ({
                type: 'Feature' as const,
                properties: { name: stop.name },
                geometry: { type: 'Point' as const, coordinates: [stop.lng, stop.lat] },
              })),
            ],
          },
        })
        map.addLayer({
          id: 'rd-line',
          type: 'line',
          source: 'rd-line',
          filter: ['==', '$type', 'LineString'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': route.color, 'line-width': 4, 'line-opacity': 0.9 },
        })
        map.addLayer({
          id: 'rd-stops',
          type: 'circle',
          source: 'rd-line',
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 5,
            'circle-color': '#ffffff',
            'circle-stroke-color': route.color,
            'circle-stroke-width': 3,
          },
        })
        const bounds = new LngLatBounds()
        coords.forEach((coord) => bounds.extend(coord))
        map.fitBounds(bounds, { padding: 70, duration: 600 })
      } catch {
        void 0
      }
    }
    void draw()
    return () => {
      cancelled = true
    }
  }, [selectedRouteId, mapReady])

  useEffect(() => {
    return () => {
      markersRef.current.forEach((entry) => entry.marker.remove())
      markersRef.current.clear()
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
    }
  }, [])

  const vehicle = vehicleDetail.data ?? sheetVehicle
  const distance =
    vehicle && userCoords
      ? haversineKm(userCoords.lat, userCoords.lng, vehicle.lat, vehicle.lng)
      : null

  const filterOptions: { value: FilterValue; label: string }[] = [
    { value: 'all', label: t('map.allTypes') },
    { value: 'bus', label: t('map.typeBus') },
    { value: 'minibus', label: t('map.typeMinibus') },
    { value: 'taxi', label: t('map.typeTaxi') },
    { value: 'train', label: t('map.typeTrain') },
  ]

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapCanvas center={MAP_CENTER} zoom={12} onReady={handleReady} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 backdrop-blur-md">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              wsStatus === 'open' ? 'bg-success' : 'bg-warning',
            )}
          />
          <span className="text-xs font-semibold text-text">
            {wsStatus === 'open' ? t('map.live') : t('map.connecting')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="pointer-events-auto flex h-10 items-center gap-2 rounded-full border border-border bg-surface/90 px-4 text-xs font-semibold text-text backdrop-blur-md"
        >
          {filter === 'all' ? t('map.filter') : filterOptions.find((o) => o.value === filter)?.label}
        </button>
      </div>

      <div className="absolute right-3 top-20 z-10 flex flex-col gap-2">
        <button
          type="button"
          aria-label={t('map.zoomIn')}
          onClick={() => mapRef.current?.zoomIn()}
          className="flex h-10 w-10 items-center justify-center rounded-btn border border-border bg-surface/90 text-lg font-bold text-text backdrop-blur-md"
        >
          +
        </button>
        <button
          type="button"
          aria-label={t('map.zoomOut')}
          onClick={() => mapRef.current?.zoomOut()}
          className="flex h-10 w-10 items-center justify-center rounded-btn border border-border bg-surface/90 text-lg font-bold text-text backdrop-blur-md"
        >
          −
        </button>
        <button
          type="button"
          aria-label={t('map.myLocation')}
          onClick={recenter}
          className="flex h-10 w-10 items-center justify-center rounded-btn border border-border bg-surface/90 text-accent backdrop-blur-md"
        >
          <LocationIcon size={20} />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center px-4">
        <Segmented<ViewMode>
          options={[
            { value: '2d', label: t('map.view2d') },
            { value: '3d', label: t('map.view3d') },
          ]}
          value={viewMode}
          onChange={setViewMode}
          className="w-40 border border-border backdrop-blur-md"
        />
      </div>

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title={t('map.filterTitle')}>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setFilter(option.value)
                setFilterOpen(false)
              }}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                filter === option.value
                  ? 'bg-accent text-white'
                  : 'bg-surface-2 text-muted hover:text-text',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet
        open={Boolean(vehicle)}
        onClose={() => {
          setSheetVehicle(null)
          setSelectedRouteId(null)
        }}
        title={vehicle?.route?.name ?? t('map.title')}
      >
        {vehicle ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-btn text-white"
                style={{ background: vehicle.route?.color ?? '#2f6bff' }}
              >
                <BusIcon size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-text">
                  {vehicle.route?.from_name} → {vehicle.route?.to_name}
                </p>
                <p className="truncate text-xs text-muted">{vehicle.plate}</p>
              </div>
              <Badge tone={vehicle.status === 'moving' ? 'success' : 'neutral'}>
                {vehicle.status === 'moving' ? t('map.live') : t('map.offline')}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-btn bg-surface-2 py-2">
                <p className="text-sm font-bold text-text">
                  {distance != null ? etaMinutes(distance) : '--'}
                </p>
                <p className="text-[11px] text-muted">{t('common.min')}</p>
              </div>
              <div className="rounded-btn bg-surface-2 py-2">
                <p className="text-sm font-bold text-text">
                  {distance != null ? distance.toFixed(1) : '--'}
                </p>
                <p className="text-[11px] text-muted">{t('common.km')}</p>
              </div>
              <div className="rounded-btn bg-surface-2 py-2">
                <p className="text-sm font-bold text-text">{Math.round(vehicle.speed)}</p>
                <p className="text-[11px] text-muted">{t('map.kmh')}</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-btn border border-border px-3 py-2.5 text-sm">
              <span className="text-muted">{t('map.seatsFree')}</span>
              <span className="font-bold text-text">
                {vehicle.seats_free}/{vehicle.seats_total}
              </span>
            </div>

            <Button
              fullWidth
              onClick={() => {
                if (vehicle.route_id != null) navigate(`/app/routes/${vehicle.route_id}`)
              }}
            >
              {t('map.openRoute')}
            </Button>

            {vehicle.driver_id != null ? (
              <Button
                variant="secondary"
                fullWidth
                leftIcon={<span>★</span>}
                onClick={() => setReviewOpen(true)}
              >
                {t('route.reviewDriver')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <ReviewSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        drivers={reviewDrivers}
        initialDriverId={reviewDrivers[0]?.id}
      />
    </div>
  )
}
