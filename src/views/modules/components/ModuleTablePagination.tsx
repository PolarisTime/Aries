import { Pagination } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useMemo } from 'react'
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
  /*
   * 按 scope 把相邻指标归组: 口径只渲染一次, 组内平铺各指标。
   * 这样「已选 15 项」不会在三个指标前各重复一遍, 同时每个数值仍属于明确的口径组。
   */
  const groups = useMemo(() => {
    const result: Array<{ scope?: string; items: ModuleOverviewItem[] }> = []
    for (const item of overviewItems) {
      const last = result.at(-1)
      if (last && last.scope === item.scope) {
        last.items.push(item)
        continue
      }
      result.push({ scope: item.scope, items: [item] })
    }
    return result
  }, [overviewItems])
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
          {groups.map((group) => (
            <span
              className="module-table-pagination-group"
              key={group.scope ?? group.items[0]?.label}
            >
              {group.scope ? (
                <span className="module-table-pagination-scope">
                  {group.scope}
                </span>
              ) : null}
              {group.items.map((item) => (
                <span
                  className="module-table-pagination-metric"
                  key={item.label}
                >
                  <span>{item.label}：</span>
                  <strong>{item.value}</strong>
                </span>
              ))}
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
          showLessItems
          showSizeChanger
          pageSizeOptions={['10', '20', '30', '50', '100']}
          locale={PAGINATION_LOCALE}
          onChange={onPageChange}
        />
      </div>
    </nav>
  )
}
