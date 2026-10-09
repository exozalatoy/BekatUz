import type { ReactNode } from 'react'
import { cn } from '../lib/utils'
import { Spinner } from './Spinner'

export interface Column<T> {
  key: string
  header: ReactNode
  render?: (row: T, index: number) => ReactNode
  className?: string
  headerClassName?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string | number
  loading?: boolean
  empty?: ReactNode
  onRowClick?: (row: T) => void
  className?: string
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  onRowClick,
  className,
}: TableProps<T>) {
  const isEmpty = !loading && rows.length === 0
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface/70">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold tracking-wide text-muted uppercase whitespace-nowrap',
                  column.headerClassName,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <Spinner className="text-primary" />
              </td>
            </tr>
          )}
          {isEmpty && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-4">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-line/70 last:border-0',
                onRowClick && 'cursor-pointer hover:bg-surface/60',
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-4 py-3 align-middle text-navy',
                    column.className,
                  )}
                >
                  {column.render
                    ? column.render(row, index)
                    : String((row as Record<string, unknown>)[column.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
