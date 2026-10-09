import { useEffect, useRef } from 'react'
import { Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cn } from '../lib/utils'

export function MapCanvas({
  center,
  zoom,
  onReady,
  className,
}: {
  center: [number, number]
  zoom: number
  onReady: (map: MapLibreMap) => void
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new MapLibreMap({
      container,
      center,
      zoom,
      pitch: 0,
      bearing: 0,
      dragRotate: true,
      touchZoomRotate: true,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
    })

    map.once('load', () => onReady(map))

    return () => {
      map.remove()
    }
  }, [center, zoom, onReady])

  return <div ref={containerRef} className={cn('map-dark h-full w-full', className)} />
}
