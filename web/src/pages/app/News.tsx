import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { SkeletonList } from '../../components/Skeleton'
import { Tabs, type TabItem } from '../../components/Tabs'
import { EyeIcon, NewsIcon, RefreshIcon } from '../../components/icons'
import { api } from '../../lib/api'
import { clampText, formatDate } from '../../lib/utils'
import type { Lang, NewsOut, Page } from '../../lib/types'

export function News() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.language as Lang

  const [category, setCategory] = useState('all')

  const tabs: TabItem[] = [
    { id: 'all', label: t('news.tabAll') },
    { id: 'transport', label: t('news.tabTransport') },
    { id: 'city', label: t('news.tabCity') },
    { id: 'announcements', label: t('news.tabAnnouncements') },
  ]

  const query = useInfiniteQuery({
    queryKey: ['news', category],
    queryFn: ({ pageParam }) =>
      api.get<Page<NewsOut>>('/news', { category, page: pageParam, page_size: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
  })

  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  const isFirstLoad = query.isPending

  return (
    <div className="flex flex-col px-4 pb-6 pt-5">
      <h1 className="text-xl font-bold text-text">{t('news.title')}</h1>
      <Tabs tabs={tabs} value={category} onChange={setCategory} className="mt-4" />

      <div className="mt-4 flex flex-col gap-3">
        {isFirstLoad ? (
          <SkeletonList rows={4} />
        ) : query.isError ? (
          <EmptyState
            icon={<RefreshIcon size={26} />}
            title={t('common.error')}
            action={
              <Button size="sm" variant="secondary" onClick={() => query.refetch()}>
                {t('common.retry')}
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState icon={<NewsIcon size={26} />} title={t('news.empty')} />
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/app/news/${item.id}`)}
              className="overflow-hidden rounded-card border border-border bg-surface text-left transition active:scale-[0.99]"
            >
              <div className="relative h-40 w-full" style={{ background: 'linear-gradient(135deg,#2F6BFF,#1c47b3)' }}>
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
                {item.category === 'announcements' ? (
                  <span className="absolute left-3 top-3 rounded-full bg-warning px-2.5 py-1 text-xs font-bold text-black">
                    {t('news.tabAnnouncements')}
                  </span>
                ) : null}
              </div>
              <div className="p-4">
                <h2 className="text-base font-bold text-text">{item.title}</h2>
                <p className="mt-1.5 text-sm text-muted">{clampText(item.body, 90)}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>{formatDate(item.published_at, lang)}</span>
                  <span className="flex items-center gap-1">
                    <EyeIcon size={15} />
                    {item.views}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {query.hasNextPage ? (
        <Button
          variant="secondary"
          fullWidth
          className="mt-4"
          loading={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {t('news.loadMore')}
        </Button>
      ) : null}
    </div>
  )
}

