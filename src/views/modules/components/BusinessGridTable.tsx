import { CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import Empty from 'antd/es/empty'
import Spin from 'antd/es/spin'
import type { ColumnsType, TableProps } from 'antd/es/table'
import Table from 'antd/es/table'
import type { SortOrder } from 'antd/es/table/interface'
import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDeferredColumns } from '@/hooks/useDeferredColumns'
import type { ModuleRecord } from '@/types/module-page'

const MIN_TABLE_BODY_SCROLL_Y = 240
const TABLE_SCROLL_RESERVED_SPACE = 0

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
  hasNextPage: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
  onSortingChange: (columnKey?: string | number, order?: SortOrder) => void
  containerRef?: (node: HTMLElement | null) => void
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
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  onSortingChange,
  containerRef: externalContainerRef,
}: Props) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [scrollY, setScrollY] = useState<number>(MIN_TABLE_BODY_SCROLL_Y)
  const visibleColumns = useDeferredColumns(columns)
  const selection = useMemo(
    () => (rowSelection ? { ...rowSelection, columnWidth: 40 } : undefined),
    [rowSelection],
  )

  const isVirtual = dataSource.length > 100
  const scrollX = useMemo(() => {
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
    // 勾选框列宽 40px
    return total + 40
  }, [visibleColumns])

  const scroll = useMemo(
    () => ({ x: scrollX, y: scrollY }),
    [scrollX, scrollY],
  )

  // ---- Ref 快照 ----
  const isFetchingNextPageRef = useRef(isFetchingNextPage)
  const hasNextPageRef = useRef(hasNextPage)
  const fetchNextPageRef = useRef(fetchNextPage)
  const dataSourceRef = useRef(dataSource)
  isFetchingNextPageRef.current = isFetchingNextPage
  hasNextPageRef.current = hasNextPage
  fetchNextPageRef.current = fetchNextPage
  dataSourceRef.current = dataSource

  // O(1) 查找 record id → dataSource 索引
  const dataIndexMapRef = useRef<Map<string, number>>(new Map())
  useEffect(() => {
    const map = new Map<string, number>()
    dataSource.forEach((r, i) => map.set(String(r.id), i))
    dataIndexMapRef.current = map
  }, [dataSource])

  // 估算填满视口需要的行数（antd small size 行高约 36px）
  const estimatedVisibleRows = useMemo(() => {
    if (scrollY <= 0) return 10
    return Math.ceil(scrollY / 36)
  }, [scrollY])

  // 检测：最后一个可见行在数据源中的索引是否接近末尾
  const isLastVisibleNearEnd = useCallback((): boolean => {
    const shell = shellRef.current
    if (!shell) return false
    const rows = shell.querySelectorAll('.ant-table-row')
    if (rows.length === 0) return false
    const lastRow = rows[rows.length - 1] as HTMLElement
    const lastKey = lastRow.getAttribute('data-row-key')
    if (lastKey == null) return false
    const lastIndex = dataIndexMapRef.current.get(lastKey)
    if (lastIndex == null) return false
    return lastIndex >= dataSourceRef.current.length - 3
  }, [])

  // ---- scrollY 计算 ----
  useEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof ResizeObserver === 'undefined') return

    let frameId = 0
    const measure = () => {
      const containerHeight = shell.clientHeight
      if (containerHeight <= 0) return
      const headerHeight =
        shell.querySelector('.ant-table-thead')?.getBoundingClientRect()
          .height || 0
      const nextScrollY = computeTableBodyScrollY(
        containerHeight,
        headerHeight,
        0,
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

  // ---- 自动补齐：行数不足填满视口时拉取更多 ----
  useEffect(() => {
    if (loading || isFetchingNextPage || !hasNextPage) return
    if (dataSource.length >= estimatedVisibleRows) return

    const timer = setTimeout(() => {
      if (hasNextPageRef.current && !isFetchingNextPageRef.current) {
        fetchNextPageRef.current()
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [dataSource.length, estimatedVisibleRows, loading, isFetchingNextPage, hasNextPage])

  // ---- 滚动加载检测 ----
  useEffect(() => {
    if (!hasNextPage) return

    const shell = shellRef.current
    if (!shell) return

    const tryLoadMore = () => {
      if (isFetchingNextPageRef.current || !hasNextPageRef.current) return
      if (isLastVisibleNearEnd()) {
        fetchNextPageRef.current()
      }
    }

    // 非虚拟模式：scroll 事件
    const body = shell.querySelector('.ant-table-body') as HTMLElement | null
    body?.addEventListener('scroll', tryLoadMore, { passive: true })

    // 虚拟模式：wheel 事件（VirtualList 拦截 wheel，事件冒泡到 shell）
    shell.addEventListener('wheel', tryLoadMore, { passive: true })

    return () => {
      body?.removeEventListener('scroll', tryLoadMore)
      shell.removeEventListener('wheel', tryLoadMore)
    }
  }, [hasNextPage, isLastVisibleNearEnd])

  // ---- 合并 shellRef 和外部 containerRef ----
  const setShellRef = useCallback(
    (node: HTMLDivElement | null) => {
      shellRef.current = node
      externalContainerRef?.(node)
    },
    [externalContainerRef],
  )

  const onRow = useCallback(
    (record: ModuleRecord) => ({
      onClick: (event: MouseEvent<HTMLElement>) => {
        const target = event.target as HTMLElement | null
        if (
          target?.closest(
            'button, a, .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]',
          )
        ) return
        onRowClick(record)
      },
      onDoubleClick: (event: MouseEvent<HTMLElement>) => {
        const target = event.target as HTMLElement | null
        if (
          target?.closest(
            'button, a, .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]',
          )
        ) return
        onRowDoubleClick(record)
      },
    }),
    [onRowClick, onRowDoubleClick],
  )

  const footer = useCallback(
    () => (
      <div
        style={{
          textAlign: 'center',
          padding: '8px 0',
          color: '#999',
          fontSize: 12,
        }}
      >
        {isFetchingNextPage ? (
          <>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} size="small" />
            <span style={{ marginLeft: 6 }}>加载中...</span>
          </>
        ) : !hasNextPage && dataSource.length > 0 ? (
          <>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />
            <span style={{ marginLeft: 6 }}>已加载全部数据</span>
          </>
        ) : null}
      </div>
    ),
    [isFetchingNextPage, hasNextPage, dataSource.length],
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
    <div ref={setShellRef} className="module-table-shell">
      <Table
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
        footer={footer}
        onRow={onRow}
        locale={locale}
        onChange={onChange}
      />
    </div>
  )
}
