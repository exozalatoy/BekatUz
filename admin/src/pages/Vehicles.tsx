import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { RouteList } from './RouteList'
import { VehicleList } from './VehicleList'

type Tab = 'vehicles' | 'routes'

export function VehiclesPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('vehicles')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'vehicles', label: t('vehicles.tabVehicles') },
    { id: 'routes', label: t('vehicles.tabRoutes') },
  ]

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg border border-line bg-white p-1 shadow-sm">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === item.id
                ? 'bg-primary text-white'
                : 'text-muted hover:text-navy',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'vehicles' ? <VehicleList /> : <RouteList />}
    </div>
  )
}
