import Empty from 'antd/es/empty'
import Spin from 'antd/es/spin'
import type { ColumnsType, TableProps } from 'antd/es/table'
import Table from 'antd/es/table'
import type { SortOrder } from 'antd/es/table/interface'
import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useDeferredColumns } from '@/hooks/useDeferredColumns'
import type { ModuleRecord } from '@/types/module-page'

const MIN_TABLE_BODY_SCROLL_Y = 240
const TABLE_SCROLL_RESERVED_SPACE = 0
const SCROLL_THRESHOLD = 80

export function computeTableBodyScrollY(
  containerHeight: number,
  headerHeight: number,
  paginationHeight: number,
) {
  return Math.max(
    MIN_TABLE_BODY_SCROLL_Y,
    Math.floor(
      containerHeight -
        headerHeight -
        paginationHeight -
        TABLE_SCROLL_RESERVED_SPACE,
    ),
  )
}

interface Props {
  moduleKey: string
  columns: ColumnsType<ModuleRecord>
  dataSource: ModuleRecord[]
  loading: boolean
  rowSelection?: TableProps<ModuleRecord>['rowSelection']
  rowClassName: (record: ModuleRecord) => string
  onRowClick: (record: ModuleRecord) => void
  onRowDoubleClick: (record: ModuleRecord) => void
  hasMore: boolean
  loadMore: () => void
  isFetching: boolean
  onSortingChange: (columnKey?: string | number, order?: SortOrder) => void
}

export function BusinessGridTable({
  moduleKey,
  columns,
  dataSource,
  loading,
  rowSelection,
  rowClassName,
  onRowClick,
  onRowDoubleClick,
  hasMore,
  loadMore,
  isFetching,
  onSortingChange,
}: Props) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [scrollY, setScrollY] = useState<number>(MIN_TABLE_BODY_SCROLL_Y)
  const visibleColumns = useDeferredColumns(columns)

  const isVirtual = dataSource.length * visibleColumns.length > 80
  const scrollX = useMemo(() => {
    if (!isVirtual) return 'max-content' as const
    let total = 0
    for (const col of visibleColumns) {
      const raw = col.width
      if (typeof raw === 'number') {
        total += raw
      } else if (typeof raw === 'string') {
        const parsed = Number.parseInt(raw, 10)
        total += Number.isFinite(parsed) ? parsed : 120
      } else {
        total += 120
      }
    }
    return total
  }, [visibleColumns, isVirtual])

  const selection = useMemo(
    () => (rowSelection ? { ...rowSelection, columnWidth: 40 } : undefined),
    [rowSelection],
  )

  useEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof ResizeObserver === 'undefined') {
      return
    }

    let frameId = 0

    const measure = () => {
      const containerHeight = shell.clientHeight
      if (containerHeight <= 0) {
        return
      }

      const headerHeight =
        shell.querySelector('.ant-table-thead')?.getBoundingClientRect()
          .height || 0
      const paginationHeight =
        shell.querySelector('.ant-pagination')?.getBoundingClientRect()
          .height || 0
      const nextScrollY = computeTableBodyScrollY(
        containerHeight,
        headerHeight,
        paginationHeight,
      )

      setScrollY((prev) => (prev === nextScrollY ? prev : nextScrollY))
    }

    const scheduleMeasure = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(measure)
    }

    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(shell)

    scheduleMeasure()

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [])

  // Attach scroll listener to table body for infinite loading
  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    const body = shell.querySelector('.ant-table-body') as HTMLElement | null
    if (!body) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = body
      if (
        scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD &&
        hasMore &&
        !isFetching
      ) {
        loadMore()
      }
    }

    body.addEventListener('scroll', handleScroll, { passive: true })
    return () => body.removeEventListener('scroll', handleScroll)
  }, [hasMore, isFetching, loadMore])

  return (
    <div ref={shellRef} className="module-table-shell">
      <Table
        key={moduleKey}
        rowKey="id"
        bordered
        size="small"
        loading={loading}
        columns={visibleColumns}
        dataSource={dataSource}
        rowSelection={selection}
        virtual={isVirtual}
        scroll={{ x: scrollX, y: scrollY }}
        rowClassName={rowClassName}
        onRow={(record) => ({
          onClick: (event: MouseEvent<HTMLElement>) => {
            const target = event.target as HTMLElement | null
            if (
              target?.closest(
                'button, a, .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]',
              )
            ) {
              return
            }
            onRowClick(record)
          },
          onDoubleClick: (event: MouseEvent<HTMLElement>) => {
            const target = event.target as HTMLElement | null
            if (
              target?.closest(
                'button, a, .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]',
              )
            ) {
              return
            }
            onRowDoubleClick(record)
          },
        })}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无数据"
            />
          ),
        }}
        onChange={(_pagination, _filters, sorter) => {
          const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter
          const columnKey = activeSorter?.columnKey
          onSortingChange(
            typeof columnKey === 'bigint' ? String(columnKey) : columnKey,
            activeSorter?.order,
          )
        }}
      />
      {isFetching && hasMore ? (
        <div style={{ textAlign: 'center', padding: 8 }}>
          <Spin size="small" />
        </div>
      ) : null}
    </div>
  )
}
