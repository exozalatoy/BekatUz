import { useState, type FormEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmModal, Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Input } from '../components/Input'
import { Pagination } from '../components/Pagination'
import { Select } from '../components/Select'
import { Table, type Column } from '../components/Table'
import { EditIcon, PinIcon, PlusIcon, SearchIcon, TrashIcon } from '../components/icons'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { apiDelete, apiPatch, apiPost, errorMessage, fetchPage } from '../lib/api'
import { formatDate, toDateTimeLocal } from '../lib/utils'
import { toast } from '../store/toast'
import type { NewsCategory, NewsOut } from '../types'

const PAGE_SIZE = 20
const CATEGORIES: NewsCategory[] = ['transport', 'city', 'announcements']

interface NewsForm {
  title: string
  body: string
  category: NewsCategory
  image_url: string
  is_pinned: boolean
  published_at: string
}

const emptyForm: NewsForm = {
  title: '',
  body: '',
  category: 'transport',
  image_url: '',
  is_pinned: false,
  published_at: toDateTimeLocal(new Date().toISOString()),
}

export function NewsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<NewsOut | null>(null)
  const [form, setForm] = useState<NewsForm>(emptyForm)
  const [pendingDelete, setPendingDelete] = useState<NewsOut | null>(null)

  const search = useDebouncedValue(searchInput, 400)
  const params = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    category: category || undefined,
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-news', params],
    queryFn: () => fetchPage<NewsOut>('/admin/news', params),
    placeholderData: keepPreviousData,
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { id?: number; body: Record<string, unknown> }) =>
      payload.id
        ? apiPatch<NewsOut>(`/admin/news/${payload.id}`, payload.body)
        : apiPost<NewsOut>('/admin/news', payload.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-news'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(editing ? t('toast.updated') : t('toast.created'))
      closeModal()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/news/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-news'] })
      toast.success(t('toast.deleted'))
      setPendingDelete(null)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const pinMutation = useMutation({
    mutationFn: (payload: { id: number; is_pinned: boolean }) =>
      apiPatch<NewsOut>(`/admin/news/${payload.id}`, {
        is_pinned: payload.is_pinned,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-news'] })
      toast.success(t('toast.updated'))
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: NewsOut) => {
    setEditing(item)
    setForm({
      title: item.title ?? '',
      body: item.body ?? '',
      category: item.category ?? 'transport',
      image_url: item.image_url ?? '',
      is_pinned: Boolean(item.is_pinned),
      published_at: toDateTimeLocal(item.published_at),
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) {
      toast.error(t('common.required'))
      return
    }
    const body: Record<string, unknown> = {
      title: form.title.trim(),
      body: form.body,
      category: form.category,
      image_url: form.image_url.trim() || null,
      is_pinned: form.is_pinned,
    }
    if (form.published_at) {
      body.published_at = new Date(form.published_at).toISOString()
    }
    saveMutation.mutate({ id: editing?.id, body })
  }

  const columns: Column<NewsOut>[] = [
    {
      key: 'image',
      header: t('news.preview'),
      render: (row) =>
        row.image_url ? (
          <img
            src={row.image_url}
            alt={row.title}
            className="h-10 w-16 rounded-md border border-line object-cover"
          />
        ) : (
          <span className="flex h-10 w-16 items-center justify-center rounded-md bg-surface text-[10px] text-muted">
            —
          </span>
        ),
    },
    {
      key: 'title',
      header: t('news.heading'),
      render: (row) => (
        <div className="max-w-xs">
          <p className="truncate font-medium text-navy">{row.title}</p>
          {row.is_pinned && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-primary">
              <PinIcon width={12} height={12} /> {t('news.pinned')}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: t('news.category'),
      render: (row) => (
        <Badge variant="primary">{t(`news.categories.${row.category}`)}</Badge>
      ),
    },
    { key: 'views', header: t('news.views') },
    {
      key: 'published_at',
      header: t('news.publishDate'),
      render: (row) => formatDate(row.published_at),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      headerClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className={row.is_pinned ? 'text-primary' : 'text-muted'}
            title={t('news.pinned')}
            onClick={() =>
              pinMutation.mutate({ id: row.id, is_pinned: !row.is_pinned })
            }
          >
            <PinIcon width={16} height={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row)}
            title={t('common.edit')}
          >
            <EditIcon width={16} height={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-soft"
            onClick={() => setPendingDelete(row)}
            title={t('common.delete')}
          >
            <TrashIcon width={16} height={16} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Card padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <div className="min-w-[220px] flex-1">
            <Input
              placeholder={t('news.searchPlaceholder')}
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
                setPage(1)
              }}
              leftIcon={<SearchIcon width={18} height={18} />}
            />
          </div>
          <div className="w-44">
            <Select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                setPage(1)
              }}
              options={CATEGORIES.map((item) => ({
                value: item,
                label: t(`news.categories.${item}`),
              }))}
              placeholder={t('common.all')}
            />
          </div>
          <Button leftIcon={<PlusIcon width={18} height={18} />} onClick={openCreate}>
            {t('news.addNews')}
          </Button>
        </div>

        {isError ? (
          <ErrorState
            message={errorMessage(error)}
            onRetry={() => void refetch()}
            retryLabel={t('common.retry')}
          />
        ) : (
          <>
            <Table
              columns={columns}
              rows={data?.items ?? []}
              rowKey={(row) => row.id}
              loading={isLoading}
              empty={<EmptyState title={t('common.noData')} />}
            />
            <Pagination
              page={data?.page ?? page}
              pages={data?.pages ?? 1}
              total={data?.total ?? 0}
              onPageChange={setPage}
              className="border-t border-line"
            />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? t('news.editNews') : t('news.addNews')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="news-form"
              loading={saveMutation.isPending}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="news-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('news.heading')}
            placeholder={t('news.headingPlaceholder')}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              {t('news.body')}
            </label>
            <textarea
              className="min-h-28 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={t('news.bodyPlaceholder')}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label={t('news.category')}
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value as NewsCategory })
              }
              options={CATEGORIES.map((item) => ({
                value: item,
                label: t(`news.categories.${item}`),
              }))}
            />
            <Input
              label={t('news.publishDate')}
              type="datetime-local"
              value={form.published_at}
              onChange={(event) =>
                setForm({ ...form, published_at: event.target.value })
              }
            />
          </div>
          <Input
            label={t('news.imageUrl')}
            value={form.image_url}
            onChange={(event) => setForm({ ...form, image_url: event.target.value })}
            placeholder="https://..."
          />
          {form.image_url && (
            <img
              src={form.image_url}
              alt={t('news.preview')}
              className="max-h-48 w-full rounded-lg border border-line object-cover"
            />
          )}
          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary/30"
              checked={form.is_pinned}
              onChange={(event) =>
                setForm({ ...form, is_pinned: event.target.checked })
              }
            />
            {t('news.pinned')}
          </label>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={t('common.delete')}
        message={t('news.deleteConfirm')}
        loading={deleteMutation.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  )
}
