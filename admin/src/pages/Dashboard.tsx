import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '../components/Badge'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Spinner } from '../components/Spinner'
import { StatCard } from '../components/StatCard'
import { Table, type Column } from '../components/Table'
import { BusIcon, CrownIcon, NewsIcon, UsersIcon } from '../components/icons'
import { apiGet, errorMessage } from '../lib/api'
import { formatDate, formatNumber } from '../lib/utils'
import type { AdminStats, NewsOut, UserOut } from '../types'

export function DashboardPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiGet<AdminStats>('/admin/stats'),
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="text-primary" size={28} />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Card padded={false}>
        <ErrorState
          message={errorMessage(error)}
          onRetry={() => void refetch()}
          retryLabel={t('common.retry')}
        />
      </Card>
    )
  }

  const chart = data.chart ?? []
  const latestNews = data.latest_news ?? []
  const latestUsers = data.latest_users ?? []

  const userColumns: Column<UserOut>[] = [
    {
      key: 'full_name',
      header: t('users.name'),
      render: (row) => (
        <span className="font-medium text-navy">{row.full_name}</span>
      ),
    },
    { key: 'phone', header: t('users.phone') },
    {
      key: 'role',
      header: t('users.role'),
      render: (row) => (
        <Badge variant="primary">{t(`users.roles.${row.role}`)}</Badge>
      ),
    },
    {
      key: 'created_at',
      header: t('users.createdAt'),
      render: (row) => formatDate(row.created_at),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('dashboard.users')}
          value={formatNumber(data.users)}
          accent="primary"
          icon={<UsersIcon />}
        />
        <StatCard
          label={t('dashboard.drivers')}
          value={formatNumber(data.drivers)}
          accent="success"
          icon={<BusIcon />}
        />
        <StatCard
          label={t('dashboard.orders')}
          value={formatNumber(data.orders)}
          accent="warning"
          icon={<NewsIcon />}
        />
        <StatCard
          label={t('dashboard.premium')}
          value={formatNumber(data.premium_subscriptions)}
          accent="danger"
          icon={<CrownIcon />}
        />
      </div>

      <Card
        title={t('dashboard.chartTitle')}
        subtitle={t('dashboard.chartOrders') + ' / ' + t('dashboard.chartUsers')}
      >
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="users"
                name={t('dashboard.chartUsers')}
                stroke="#2F6BFF"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                name={t('dashboard.chartOrders')}
                stroke="#16A34A"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title={t('dashboard.latestNews')} padded={false}>
          {latestNews.length === 0 ? (
            <EmptyState title={t('common.noData')} />
          ) : (
            <ul className="divide-y divide-line">
              {latestNews.map((item: NewsOut) => (
                <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <NewsIcon width={16} height={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(item.published_at)} · {item.views} {t('news.views')}
                    </p>
                  </div>
                  <Badge variant="neutral">
                    {t(`news.categories.${item.category}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('dashboard.latestUsers')} padded={false}>
          <Table
            columns={userColumns}
            rows={latestUsers}
            rowKey={(row) => row.id}
            empty={<EmptyState title={t('common.noData')} />}
          />
        </Card>
      </div>
    </div>
  )
}
