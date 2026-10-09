import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { TopBar } from '../../components/TopBar'
import { PlusIcon } from '../../components/icons'

type Provider = {
  id: 'payme' | 'click'
  name: string
  description: string
  color: string
  logo: string
}

export function Payments() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const providers: Provider[] = [
    {
      id: 'payme',
      name: t('premium.payme'),
      description: t('payments.paymeDesc'),
      color: '#33CCCC',
      logo: 'P',
    },
    {
      id: 'click',
      name: t('premium.click'),
      description: t('payments.clickDesc'),
      color: '#0088CC',
      logo: 'C',
    },
  ]

  return (
    <div className="pb-8">
      <TopBar title={t('payments.title')} onBack={() => navigate('/app/profile')} />
      <div className="flex flex-col gap-3 px-4 pt-4">
        {providers.map((provider) => (
          <Card key={provider.id} className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-card text-xl font-extrabold text-white"
              style={{ background: provider.color }}
            >
              {provider.logo}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text">{provider.name}</p>
              <p className="text-xs text-muted">{provider.description}</p>
            </div>
            <Badge tone="success">{t('payments.linked')}</Badge>
          </Card>
        ))}
        <Button variant="secondary" fullWidth leftIcon={<PlusIcon size={18} />} className="mt-2">
          {t('payments.addCard')}
        </Button>
      </div>
    </div>
  )
}
