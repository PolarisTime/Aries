import { Pagination } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useMemo } from 'react'
import type { Key } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModuleRecord } from '@/types/module-page'
import { formatAmount, formatInteger, formatWeight } from '@/utils/formatters'

interface Props {
  total: number
  currentPage: number
  pageSize: number
  records: ModuleRecord[]
  selectedRowKeys: Key[]
  onPageChange: (page: number, pageSize: number) => void
}

const AMOUNT_KEYS = ['totalAmount', 'amount', 'totalFreight'] as const
const PAGINATION_LOCALE = {
  ...zhCN.Pagination,
  items_per_page: '/ 页',
  page: '页',
}

function numericValue(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function recordAmount(record: ModuleRecord): number {
  const key = AMOUNT_KEYS.find((candidate) => record[candidate] != null)
  return key ? numericValue(record[key]) : 0
}

export function ModuleTablePagination({
  total,
  currentPage,
  pageSize,
  records,
  selectedRowKeys,
  onPageChange,
}: Props) {
  const { t } = useTranslation()
  const selectedKeySet = useMemo(
    () => new Set(selectedRowKeys.map(String)),
    [selectedRowKeys],
  )
  const summaryRecords = selectedKeySet.size
    ? records.filter((record) => selectedKeySet.has(String(record.id)))
    : records
  const summary = summaryRecords.reduce(
    (result, record) => ({
      weight:
        result.weight +
        numericValue(record.totalWeight ?? record.weightTon),
      amount: result.amount + recordAmount(record),
    }),
    { weight: 0, amount: 0 },
  )
  const rangeStart = records.length ? (currentPage - 1) * pageSize + 1 : 0
  const rangeEnd = records.length ? rangeStart + records.length - 1 : 0

  return (
    <nav
      className="module-table-pagination"
      aria-label={t('modules.workspace.pagination')}
    >
      <div
        className="module-table-pagination-summary"
        data-testid="pagination-summary"
        aria-live="polite"
      >
        <span>
          {t('modules.overview.documentCount')}：
          {formatInteger(summaryRecords.length)}
        </span>
        <span>
          {t('modules.print.totalWeight')}：{formatWeight(summary.weight)} 吨
        </span>
        <span>
          {t('modules.overview.totalAmount')}：{formatAmount(summary.amount)}
        </span>
      </div>
      <div className="module-table-pagination-controls">
        <span
          className="module-table-pagination-range"
          data-testid="pagination-range"
        >
          {t('modules.workspace.paginationRange', {
            start: rangeStart,
            end: rangeEnd,
            total,
          })}
        </span>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={total}
          size="small"
          responsive
          showLessItems
          showSizeChanger
          pageSizeOptions={['10', '20', '50', '100']}
          locale={PAGINATION_LOCALE}
          onChange={onPageChange}
        />
      </div>
    </nav>
  )
}
