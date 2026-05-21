import Empty from 'antd/es/empty'
import type { ColumnsType, TableProps } from 'antd/es/table'
import Table from 'antd/es/table'
import type { SortOrder } from 'antd/es/table/interface'
import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDeferredColumns } from '@/hooks/useDeferredColumns'
import type { ModuleRecord } from '@/types/module-page'

const MIN_TABLE_BODY_SCROLL_Y = 240

export function computeTableBodyScrollY(
  containerHeight: number,
  headerHeight: number,
  paginationHeight: number,
) {
  return Math.max(
    MIN_TABLE_BODY_SCROLL_Y,
    containerHeight - headerHeight - paginationHeight,
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
  onSortingChange,
}: Props) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [scrollY, setScrollY] = useState<number>(MIN_TABLE_BODY_SCROLL_Y)
  const visibleColumns = useDeferredColumns(columns)

  useEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof ResizeObserver === 'undefined') return

    let frameId = 0
    const measure = () => {
      const containerHeight = shell.clientHeight
      if (containerHeight <= 0) return
      const headerHeight =
        shell.querySelector('.ant-table-thead')?.getBoundingClientRect().height || 0
      const nextScrollY = Math.max(
        MIN_TABLE_BODY_SCROLL_Y,
        containerHeight - headerHeight,
      )
      setScrollY((prev) =>
        prev === nextScrollY ? prev : nextScrollY,
      )
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

  const selection = useMemo(
    () => (rowSelection ? { ...rowSelection, columnWidth: 40 } : undefined),
    [rowSelection],
  )

  const isVirtual = dataSource.length > 100

  const scrollX = useMemo(() => {
    let totalWidth = 0
    for (const col of visibleColumns) {
      const raw = col.width
      if (typeof raw === 'number') totalWidth += raw
      else if (typeof raw === 'string') {
        const parsed = Number.parseInt(raw, 10)
        totalWidth += Number.isFinite(parsed) ? parsed : 120
      } else totalWidth += 120
    }
    return totalWidth + 40
  }, [visibleColumns])

  const scroll = useMemo(
    () => ({ x: scrollX, y: scrollY }),
    [scrollX, scrollY],
  )

  const doubleClickCooldownRef = useRef(0)
  const onRowClickRef = useRef(onRowClick)
  const onRowDoubleClickRef = useRef(onRowDoubleClick)
  onRowClickRef.current = onRowClick
  onRowDoubleClickRef.current = onRowDoubleClick

  const onRow = useCallback(
    (record: ModuleRecord) => ({
      onClick: (event: MouseEvent<HTMLElement>) => {
        const target = event.target as HTMLElement | null
        if (
          target?.closest(
            'button, a, .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]',
          )
        ) return
        onRowClickRef.current(record)
      },
      onDoubleClick: (event: MouseEvent<HTMLElement>) => {
        const target = event.target as HTMLElement | null
        if (
          target?.closest(
            'button, a, .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]',
          )
        ) return
        const now = Date.now()
        if (now - doubleClickCooldownRef.current < 500) return
        doubleClickCooldownRef.current = now
        onRowDoubleClickRef.current(record)
      },
    }),
    [],
  )

  const emptyText = useMemo(
    () => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />,
    [],
  )
  const locale = useMemo(() => ({ emptyText }), [emptyText])

  const onChange = useCallback(
    (_pagination: unknown, _filters: unknown, sorter: unknown) => {
      const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter
      const columnKey = (activeSorter as { columnKey?: string | number })?.columnKey
      onSortingChange(
        typeof columnKey === 'bigint' ? String(columnKey) : columnKey,
        (activeSorter as { order?: SortOrder })?.order,
      )
    },
    [onSortingChange],
  )

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
        tableLayout="fixed"
        pagination={false}
        scroll={scroll}
        rowClassName={rowClassName}
        onRow={onRow}
        locale={locale}
        onChange={onChange}
      />
    </div>
  )
}
