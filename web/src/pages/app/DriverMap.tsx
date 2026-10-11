import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LngLatBounds, Marker, type Map as MapLibreMap } from 'maplibre-gl'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { MapCanvas } from '../../components/MapCanvas'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/toast-context'
import {
  BusIcon,
  ClockIcon,
  LocationIcon,
  PhoneIcon,
  RefreshIcon,
  SendIcon,
} from '../../components/icons'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { bearingBetween } from '../../lib/geo'
import { WSClient, type WSStatus } from '../../lib/ws'
import { TASHKENT, cn, formatSom } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'
import { useCallStore } from '../../store/call'
import type {
  ChatConversation,
  DriverMe,
  DriverRequest,
  DriverRequestEvent,
  DriverRequestList,
  RouteDetail,
} from '../../lib/types'

const STATUS_KEYS: Record<string, string> = {
  pending: 'driver.statusPending',
  accepted: 'driver.statusAccepted',
  in_progress: 'driver.statusInProgress',
  completed: 'driver.statusCompleted',
  declined: 'driver.statusDeclined',
}

const STATUS_TONES: Record<string, 'success' | 'accent' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'warning',
  accepted: 'accent',
  in_progress: 'accent',
  completed: 'success',
  declined: 'danger',
}

type Position = { lat: number; lng: number; speed: number; bearing: number }

const DRIVER_CENTER: [number, number] = [TASHKENT.lng, TASHKENT.lat]

export function DriverMap() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const startCall = useCallStore((state) => state.startCall)

  const [mapReady, setMapReady] = useState(false)
  const [wsStatus, setWsStatus] = useState<WSStatus>('connecting')
  const [simulated, setSimulated] = useState(() => !('geolocation' in navigator))

  const mapRef = useRef<MapLibreMap | null>(null)
  const myMarkerRef = useRef<Marker | null>(null)
  const latestPos = useRef<Position | null>(null)
  const onlineRef = useRef(false)
  const clientRef = useRef<WSClient | null>(null)
  const progressRef = useRef(0)

  const meQuery = useQuery({
    queryKey: ['driver-me'],
    queryFn: () => api.get<DriverMe>('/drivers/me'),
  })

  const requestsQuery = useQuery({
    queryKey: ['driver-requests'],
    queryFn: () => api.get<DriverRequestList>('/drivers/requests'),
    refetchInterval: 8000,
  })

  const routeId = meQuery.data?.vehicle?.route_id ?? null
  const routeQuery = useQuery({
    queryKey: ['route', routeId],
    queryFn: () => api.get<RouteDetail>(`/routes/${routeId}`),
    enabled: routeId != null,
  })
  const route = routeQuery.data ?? null
  const online = meQuery.data?.online ?? false

  useEffect(() => {
    onlineRef.current = online
  }, [online])

  const toggle = useMutation({
    mutationFn: (value: boolean) => api.patch('/drivers/me', { online: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-me'] }),
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  const acceptMutation = useMutation({
    mutationFn: (id: number) => api.post(`/drivers/requests/${id}/accept`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-requests'] })
      toast.show(t('driver.accepted'), 'success')
    },
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  const declineMutation = useMutation({
    mutationFn: (id: number) => api.post(`/drivers/requests/${id}/decline`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-requests'] })
      toast.show(t('driver.declined'), 'success')
    },
    onError: (error) => toast.show(getErrorMessage(error, t), 'error'),
  })

  const placeMyMarker = useCallback(() => {
    const map = mapRef.current
    const position = latestPos.current
    if (!map || !position) return
    if (!myMarkerRef.current) {
      const element = document.createElement('div')
      element.className = 'map-vehicle-marker'
      element.style.setProperty('--marker-color', '#2f6bff')
      element.innerHTML =
        '<span class="map-vehicle-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11"/><path d="M4 11h16"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/></svg></span>'
      myMarkerRef.current = new Marker({ element, rotationAlignment: 'map' })
        .setLngLat([position.lng, position.lat])
        .addTo(map)
    }
    myMarkerRef.current.setLngLat([position.lng, position.lat])
    myMarkerRef.current.setRotation(position.bearing)
  }, [])

  const handleReady = useCallback((map: MapLibreMap) => {
    mapRef.current = map
    myMarkerRef.current = null
    latestPos.current = null
    setMapReady(true)
  }, [])

  useEffect(() => {
    if (!mapReady || !route || route.stops.length < 2) return
    const map = mapRef.current
    if (!map) return
    const coords = route.stops.map((stop) => [stop.lng, stop.lat] as [number, number])
    if (map.getLayer('dm-line')) map.removeLayer('dm-line')
    if (map.getSource('dm-line')) map.removeSource('dm-line')
    map.addSource('dm-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      },
    })
    map.addLayer({
      id: 'dm-line',
      type: 'line',
      source: 'dm-line',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': route.color, 'line-width': 4, 'line-opacity': 0.9 },
    })
    const bounds = new LngLatBounds()
    coords.forEach((coord) => bounds.extend(coord))
    if (!latestPos.current) map.fitBounds(bounds, { padding: 60, duration: 0 })
  }, [mapReady, route])

  useEffect(() => {
    if (!accessToken) return
    const client = new WSClient(`/ws/driver?token=${encodeURIComponent(accessToken)}`)
    client.onStatus = (status) => setWsStatus(status)
    client.onMessage = (raw) => {
      const message = raw as Partial<DriverRequestEvent> | null
      if (message?.type === 'request') {
        void queryClient.invalidateQueries({ queryKey: ['driver-requests'] })
      }
    }
    clientRef.current = client
    client.connect()
    return () => {
      client.close()
      clientRef.current = null
    }
  }, [accessToken, queryClient])

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setSimulated(false)
        latestPos.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed ?? 22,
          bearing: position.coords.heading ?? 0,
        }
        placeMyMarker()
      },
      () => setSimulated(true),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [placeMyMarker])

  useEffect(() => {
    if (!simulated) return
    const stops = route?.stops
    if (!stops || stops.length < 2) return
    latestPos.current = { lat: stops[0].lat, lng: stops[0].lng, speed: 24, bearing: 0 }
    placeMyMarker()
    const timer = window.setInterval(() => {
      progressRef.current = (progressRef.current + 0.06) % 1
      const scaled = progressRef.current * (stops.length - 1)
      const index = Math.min(stops.length - 2, Math.floor(scaled))
      const local = scaled - index
      const a = stops[index]
      const b = stops[index + 1]
      latestPos.current = {
        lat: a.lat + (b.lat - a.lat) * local,
        lng: a.lng + (b.lng - a.lng) * local,
        speed: 24,
        bearing: bearingBetween(a.lat, a.lng, b.lat, b.lng),
      }
      placeMyMarker()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [simulated, route, placeMyMarker])

  const sendLocation = useCallback(() => {
    if (!onlineRef.current) return
    const client = clientRef.current
    const position = latestPos.current
    if (!client || !position) return
    client.send({
      type: 'location',
      lat: position.lat,
      lng: position.lng,
      speed: position.speed,
      bearing: position.bearing,
    })
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => sendLocation(), 3000)
    return () => window.clearInterval(timer)
  }, [sendLocation])

  useEffect(() => {
    return () => {
      myMarkerRef.current?.remove()
      myMarkerRef.current = null
    }
  }, [])

  const requests = requestsQuery.data?.items ?? []
  const pending = requests.filter((request) => request.status === 'pending')
  const others = requests.filter((request) => request.status !== 'pending')

  const renderRequest = (request: DriverRequest) => (
    <Card key={request.id} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-accent-soft text-accent">
          <BusIcon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-text">
            {request.passenger_name ?? t('common.no')}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-muted">
            <LocationIcon size={13} />
            {request.from_name} → {request.to_name}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="text-sm font-bold text-accent">{formatSom(request.price_som)}</p>
          <Badge tone={STATUS_TONES[request.status] ?? 'neutral'}>
            {STATUS_KEYS[request.status] ? t(STATUS_KEYS[request.status] as string) : request.status}
          </Badge>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<PhoneIcon size={16} />}
          onClick={() => {
            if (!request.passenger_id) {
              toast.show(t('driver.callUnavailable'), 'info')
              return
            }
            void startCall({
              id: request.passenger_id,
              full_name: request.passenger_name ?? t('common.no'),
              avatar_url: null,
              online: true,
            })
          }}
        >
          {t('driver.call')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<SendIcon size={16} />}
          onClick={() => {
            if (request.passenger_id == null) {
              toast.show(t('driver.callUnavailable'), 'info')
              return
            }
            void api
              .get<ChatConversation>(`/chats/conversation?peer_id=${request.passenger_id}`)
              .then((conversation) => navigate(`/app/chat/${conversation.id}`))
              .catch(() => toast.show(t('chat.error'), 'error'))
          }}
        >
          {t('driver.chat')}
        </Button>
        {request.status === 'pending' ? (
          <>
            <Button
              size="sm"
              variant="primary"
              className="ml-auto"
              loading={acceptMutation.isPending}
              onClick={() => acceptMutation.mutate(request.id)}
            >
              {t('driver.accept')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={declineMutation.isPending}
              onClick={() => declineMutation.mutate(request.id)}
            >
              {t('driver.decline')}
            </Button>
          </>
        ) : null}
      </div>
    </Card>
  )

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t('driver.mapTitle')} onBack={() => navigate('/app/driver')} />

      <div className="relative h-64 shrink-0 overflow-hidden">
        <MapCanvas center={DRIVER_CENTER} zoom={12} onReady={handleReady} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 backdrop-blur-md">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                wsStatus === 'open' ? 'bg-success' : 'bg-warning',
              )}
            />
            <span className="text-xs font-semibold text-text">
              {wsStatus === 'open' ? t('driver.connected') : t('driver.connecting')}
            </span>
          </div>
          <div className="pointer-events-auto flex flex-col items-end gap-1">
            {simulated ? (
              <span className="rounded-full bg-surface/90 px-3 py-1 text-[10px] font-semibold text-warning backdrop-blur-md">
                {t('driver.simulated')}
              </span>
            ) : null}
            <button
              type="button"
              aria-label={t('map.myLocation')}
              onClick={() => {
                const position = latestPos.current
                if (position) mapRef.current?.flyTo({ center: [position.lng, position.lat], zoom: 15 })
              }}
              className="flex h-10 w-10 items-center justify-center rounded-btn border border-border bg-surface/90 text-accent backdrop-blur-md"
            >
              <LocationIcon size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <Card className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-accent-soft text-accent">
            <BusIcon size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-text">
              {route?.name ?? meQuery.data?.vehicle_category ?? t('driver.vehicle')}
            </p>
            <p className="truncate text-xs text-muted">
              {route ? `${route.from_name} → ${route.to_name}` : meQuery.data?.vehicle?.plate ?? ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggle.mutate(!online)}
            disabled={toggle.isPending}
            className={cn(
              'flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition',
              online ? 'bg-success/15 text-success' : 'bg-surface-2 text-muted',
            )}
          >
            <span className={cn('h-2.5 w-2.5 rounded-full', online ? 'bg-success' : 'bg-muted')} />
            {online ? t('driver.online') : t('driver.offline')}
          </button>
        </Card>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted">
          <ClockIcon size={14} />
          <span>{t('driver.broadcast')}</span>
        </div>

        <h2 className="mt-4 text-base font-bold text-text">{t('driver.requests')}</h2>
        <div className="mt-3 flex flex-col gap-3">
          {requestsQuery.isPending ? (
            <EmptyState icon={<RefreshIcon size={26} />} title={t('common.loading')} />
          ) : requests.length === 0 ? (
            <EmptyState icon={<BusIcon size={26} />} title={t('driver.noRequests')} />
          ) : (
            <>
              {pending.map(renderRequest)}
              {others.map(renderRequest)}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
