import { Pagination } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useTranslation } from 'react-i18next'
import type { ModuleOverviewItem } from '@/types/module-page'

interface Props {
  total: number
  currentPage: number
  pageSize: number
  currentItemCount: number
  overviewItems: ModuleOverviewItem[]
  onPageChange: (page: number, pageSize: number) => void
}

const PAGINATION_LOCALE = {
  ...zhCN.Pagination,
  items_per_page: '/ 页',
  page: '页',
}

export function ModuleTablePagination({
  total,
  currentPage,
  pageSize,
  currentItemCount,
  overviewItems,
  onPageChange,
}: Props) {
  const { t } = useTranslation()
  const rangeStart = currentItemCount ? (currentPage - 1) * pageSize + 1 : 0
  const rangeEnd = currentItemCount ? rangeStart + currentItemCount - 1 : 0

  return (
    <nav
      className="module-table-pagination"
      aria-label={t('modules.workspace.pagination')}
    >
      {overviewItems.length ? (
        <div
          className="module-table-pagination-summary"
          data-testid="pagination-summary"
          aria-live="polite"
        >
          {overviewItems.map((item) => (
            <span className="module-table-pagination-metric" key={item.label}>
              <span>{item.label}：</span>
              <strong>{item.value}</strong>
            </span>
          ))}
        </div>
      ) : null}
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
