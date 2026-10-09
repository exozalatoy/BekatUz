import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

interface PaginationProps {
  page: number
  pages: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  page,
  pages,
  total,
  onPageChange,
  className,
}: PaginationProps) {
  const { t } = useTranslation()
  const safePages = Math.max(1, pages)
  const canPrev = page > 1
  const canNext = page < safePages

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
        className,
      )}
    >
      <p className="text-xs text-muted">
        {t('common.total')}: <span className="font-medium text-navy">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-navy transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="previous"
        >
          <ChevronLeftIcon width={16} height={16} />
        </button>
        <span className="text-xs text-muted">
          {page} / {safePages}
        </span>
        <button
          type="button"
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-navy transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="next"
        >
          <ChevronRightIcon width={16} height={16} />
        </button>
      </div>
    </div>
  )
}
