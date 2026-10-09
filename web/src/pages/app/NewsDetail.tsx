import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Skeleton } from '../../components/Skeleton'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/toast-context'
import { EyeIcon, NewsIcon, ShareIcon } from '../../components/icons'
import { api } from '../../lib/api'
import { formatDateTime } from '../../lib/utils'
import type { Lang, NewsOut } from '../../lib/types'

export function NewsDetail() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const { id } = useParams()
  const lang = i18n.language as Lang

  const query = useQuery({
    queryKey: ['news-item', id],
    queryFn: () => api.get<NewsOut>(`/news/${id}`),
    enabled: Boolean(id),
  })

  const share = async () => {
    const item = query.data
    if (!item) return
    const url = window.location.href
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>
    }
    try {
      if (nav.share) {
        await nav.share({ title: item.title, text: item.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.show(t('common.linkCopied'), 'success')
    } catch {
      void 0
    }
  }

  if (query.isPending) {
    return (
      <div>
        <TopBar title={t('news.title')} />
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div>
        <TopBar title={t('news.title')} />
        <EmptyState
          icon={<NewsIcon size={26} />}
          title={t('news.notFound')}
          action={
            <Button size="sm" variant="secondary" onClick={() => navigate('/app/news')}>
              {t('news.backToList')}
            </Button>
          }
        />
      </div>
    )
  }

  const item = query.data

  return (
    <div className="pb-8">
      <TopBar
        title={t('news.title')}
        onBack={() => navigate('/app/news')}
        right={
          <button
            type="button"
            aria-label={t('common.share')}
            onClick={share}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text"
          >
            <ShareIcon size={18} />
          </button>
        }
      />
      <div className="h-56 w-full" style={{ background: 'linear-gradient(135deg,#2F6BFF,#1c47b3)' }}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
      </div>
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold leading-snug text-text">{item.title}</h1>
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>{formatDateTime(item.published_at, lang)}</span>
          <span className="flex items-center gap-1">
            <EyeIcon size={15} />
            {item.views}
          </span>
        </div>
        <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-text/90">{item.body}</p>
      </div>
    </div>
  )
}
