import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { TopBar } from '../../components/TopBar'
import { ChevronDownIcon, SendIcon } from '../../components/icons'

type Faq = {
  question: string
  answer: string
}

export function Help() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState<number | null>(0)

  const faqs: Faq[] = [
    { question: t('help.faq1'), answer: t('help.faq1a') },
    { question: t('help.faq2'), answer: t('help.faq2a') },
    { question: t('help.faq3'), answer: t('help.faq3a') },
    { question: t('help.faq4'), answer: t('help.faq4a') },
  ]

  return (
    <div className="pb-8">
      <TopBar title={t('help.title')} onBack={() => navigate('/app/profile')} />
      <div className="flex flex-col gap-3 px-4 pt-4">
        {faqs.map((faq, index) => {
          const opened = open === index
          return (
            <Card key={faq.question} className="p-0">
              <button
                type="button"
                onClick={() => setOpen(opened ? null : index)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left"
              >
                <span className="min-w-0 flex-1 text-sm font-semibold text-text">{faq.question}</span>
                <ChevronDownIcon
                  size={18}
                  className={`shrink-0 text-muted transition-transform ${opened ? 'rotate-180' : ''}`}
                />
              </button>
              {opened ? <p className="px-4 pb-4 text-sm leading-relaxed text-muted">{faq.answer}</p> : null}
            </Card>
          )
        })}

        <Card className="mt-2 flex flex-col gap-3">
          <div>
            <p className="text-sm font-bold text-text">{t('help.contact')}</p>
            <p className="text-xs text-muted">{t('help.contactText')}</p>
          </div>
          <Button leftIcon={<SendIcon size={18} />} fullWidth>
            Telegram
          </Button>
        </Card>
      </div>
    </div>
  )
}
