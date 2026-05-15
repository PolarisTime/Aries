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
  /** 外部传入的容器 ref callback，用于动态 pageSize 计算 */
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

  // 用 ref 持久化滚动监听状态和最新闭包值
  const prevBodyRef = useRef<HTMLElement | null>(null)
  const scrollHandlerRef = useRef<(() => void) | null>(null)
  const isFetchingNextPageRef = useRef(isFetchingNextPage)
  const hasNextPageRef = useRef(hasNextPage)
  isFetchingNextPageRef.current = isFetchingNextPage
  hasNextPageRef.current = hasNextPage

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
      const nextScrollY = computeTableBodyScrollY(
        containerHeight,
        headerHeight,
        0,
      )

      setScrollY((prev) => (prev === nextScrollY ? prev : nextScrollY))
    }

    // 绑定滚动监听到表格容器（包含 header + body + footer）
    // 监听 .ant-table-container 而非 .ant-table-body，确保捕获所有滚动事件
    const attachScrollListener = (container: HTMLElement | null) => {
      if (container === prevBodyRef.current) return
      if (prevBodyRef.current && scrollHandlerRef.current) {
        prevBodyRef.current.removeEventListener('scroll', scrollHandlerRef.current)
      }
      prevBodyRef.current = container
      if (!container) {
        scrollHandlerRef.current = null
        return
      }
      // 通过 ref 读取最新值，不依赖闭包
      scrollHandlerRef.current = (e: Event) => {
        if (isFetchingNextPageRef.current || !hasNextPageRef.current) return
        const target = e.target as HTMLElement
        if (!target || target.scrollHeight <= target.clientHeight) return
        const { scrollTop, scrollHeight, clientHeight } = target
        if (scrollHeight - scrollTop - clientHeight < 100) {
          fetchNextPage()
        }
      }
      container.addEventListener('scroll', scrollHandlerRef.current, { passive: true })
    }

    const scheduleMeasure = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        measure()
        const container = shell.querySelector('.ant-table-container') as HTMLElement | null
        attachScrollListener(container)
      })
    }

    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(shell)

    scheduleMeasure()

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [fetchNextPage])

  // 组件卸载时清理滚动监听
  useEffect(() => {
    return () => {
      if (prevBodyRef.current && scrollHandlerRef.current) {
        prevBodyRef.current.removeEventListener('scroll', scrollHandlerRef.current)
      }
    }
  }, [])

  // 自动补齐：首屏数据未填满视口时，持续加载直至出现滚动条或数据耗尽
  useEffect(() => {
    if (loading || isFetchingNextPage || !hasNextPage) return

    const shell = shellRef.current
    if (!shell) return

    let frameId = 0

    const checkAndFill = () => {
      // 查找实际滚动元素（body 或 content）
      const scrollTarget =
        shell.querySelector('.ant-table-body') as HTMLElement | null
      if (!scrollTarget) return
      // 已有滚动条 → 交给滚动监听，停止自动补齐
      if (scrollTarget.scrollHeight > scrollTarget.clientHeight) return
      fetchNextPage()
    }

    // rAF 确保 DOM 渲染完成后再测量
    frameId = requestAnimationFrame(checkAndFill)

    // 窗口变大导致内容又不够时，重新触发补齐
    const handleResize = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(checkAndFill)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [dataSource, loading, isFetchingNextPage, hasNextPage, fetchNextPage])


  // 合并内部 shellRef 和外部 containerRef
  const setShellRef = useCallback(
    (node: HTMLDivElement | null) => {
      shellRef.current = node
      externalContainerRef?.(node)
    },
    [externalContainerRef],
  )

  return (
    <div ref={setShellRef} className="module-table-shell">
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
        pagination={false}
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
        footer={() => (
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
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />}
                  size="small"
                />
                <span style={{ marginLeft: 6 }}>加载中...</span>
              </>
            ) : !hasNextPage && dataSource.length > 0 ? (
              <>
                <CheckCircleOutlined
                  style={{ color: '#52c41a', fontSize: 14 }}
                />
                <span style={{ marginLeft: 6 }}>已加载全部数据</span>
              </>
            ) : null}
          </div>
        )}
      />
    </div>
  )
}
