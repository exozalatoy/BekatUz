import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { ListItem } from '../../components/ListItem'
import { TopBar } from '../../components/TopBar'
import { BusIcon } from '../../components/icons'

type Trip = {
  id: number
  route: string
  from: string
  to: string
  time: string
  price: number
  status: 'completed' | 'canceled'
}

const SAMPLE_TRIPS: Trip[] = []

export function History() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="pb-8">
      <TopBar title={t('history.title')} onBack={() => navigate('/app/profile')} />
      <div className="px-4 pt-4">
        {SAMPLE_TRIPS.length === 0 ? (
          <EmptyState
            icon={<BusIcon size={28} />}
            title={t('history.empty')}
            className="mt-10"
          />
        ) : (
          SAMPLE_TRIPS.map((trip) => (
            <ListItem
              key={trip.id}
              icon={<BusIcon size={20} />}
              title={trip.route}
              subtitle={`${trip.from} - ${trip.to} · ${trip.time}`}
              trailing={
                <Badge tone={trip.status === 'completed' ? 'success' : 'danger'}>
                  {trip.status === 'completed' ? t('history.completed') : t('history.canceled')}
                </Badge>
              }
            />
          ))
        )}
      </div>
    </div>
  )
}
