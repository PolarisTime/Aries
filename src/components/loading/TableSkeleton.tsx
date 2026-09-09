import type { ReactNode } from 'react'

export interface TableSkeletonProps {
  /** 主体行数，默认 5 行。 */
  rows?: number
  /** 是否渲染工具栏占位，默认渲染。 */
  toolbar?: boolean
  /** 是否渲染分页占位，默认渲染。 */
  pagination?: boolean
  className?: string
}

const DEFAULT_COLUMN_KEYS = [
  'column-1',
  'column-2',
  'column-3',
  'column-4',
  'column-5',
] as const

function createRowKeys(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `row-${index + 1}`)
}

/**
 * 统一表格加载骨架屏：工具栏 / 表头 / 数据行 / 分页。
 * 装饰性占位块对辅助技术隐藏，容器通过 aria-busy 标记加载状态。
 */
export function TableSkeleton({
  rows = 5,
  toolbar = true,
  pagination = true,
  className,
}: TableSkeletonProps): ReactNode {
  const rowKeys = createRowKeys(rows)
  return (
    <div
      className={['aries-skeleton', className].filter(Boolean).join(' ')}
      aria-busy="true"
      role="status"
    >
      {toolbar ? (
        <div className="aries-skeleton-row aries-skeleton-row--between">
          <span className="aries-skeleton-block aries-skeleton-toolbar aries-skeleton-cell--fixed" />
          <span className="aries-skeleton-block aries-skeleton-pill--sm" />
        </div>
      ) : null}
      <div className="aries-skeleton-row aries-skeleton-table-header">
        {DEFAULT_COLUMN_KEYS.map((key) => (
          <span
            key={key}
            className="aries-skeleton-block aries-skeleton-cell"
          />
        ))}
      </div>
      {rowKeys.map((rowKey) => (
        <div key={rowKey} className="aries-skeleton-row">
          {DEFAULT_COLUMN_KEYS.map((key) => (
            <span
              key={key}
              className="aries-skeleton-block aries-skeleton-cell"
            />
          ))}
        </div>
      ))}
      {pagination ? (
        <div className="aries-skeleton-row aries-skeleton-row--end">
          <span className="aries-skeleton-block aries-skeleton-pagination" />
        </div>
      ) : null}
    </div>
  )
}
