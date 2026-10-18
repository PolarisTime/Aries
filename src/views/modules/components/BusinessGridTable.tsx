import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons'
import { Empty, Table } from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/EmptyState'
import {
  RowContextMenuContext,
  type RowContextMenuMap,
} from '@/components/row-context-menu'
import { type EmptyStateStateInput, useEmptyState } from '@/hooks/useEmptyState'
import { useMeasureRowA11y } from '@/hooks/useMeasureRowA11y'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildTableScrollConfig,
  computeTableAvailableHeight,
  computeTableBodyScrollY,
  computeTableScrollX,
} from '@/views/modules/components/business-grid-table-utils'

const MIN_TABLE_BODY_SCROLL_Y = 120
const ROW_SINGLE_CLICK_DELAY_MS = 220
const SEQUENCE_COLUMN_WIDTH = 64
const ROW_INTERACTION_EXCLUSION_SELECTOR =
  'button, a, input, textarea, select, [contenteditable="true"], .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]'

interface Props {
  moduleKey: string
  columns: ColumnsType<ModuleRecord>
  components?: TableProps<ModuleRecord>['components']
  /** 行右键菜单查找表; 为空时行容器保持默认渲染 */
  rowContextMenus?: RowContextMenuMap
  dataSource: ModuleRecord[]
  loading: boolean
  currentPage: number
  pageSize: number
  rowSelection?: TableProps<ModuleRecord>['rowSelection']
  rowClassName: (record: ModuleRecord) => string
  onRowClick: (record: ModuleRecord) => void
  onRowDoubleClick: (record: ModuleRecord) => void
  expandable?: TableProps<ModuleRecord>['expandable']
  hasNextPage?: boolean
  fetchNextPage?: () => void
  isFetchingNextPage?: boolean
  emptyStateInput?: EmptyStateStateInput
  /**
   * 请求失败后正在自动重试（react-query `retry: 1`）的窗口。
   *
   * <p>此时 `error` 尚未暴露、`data` 也还没有，只看 `loading` 会判成"查完了、就是空"，
   * 于是先闪出「暂无数据 / 共 0 条」的假空态，约 1.2 秒后才切成错误态。
   * 传 true 时本组件把空态按住不渲染，交给加载态占位。</p>
   */
  isRetrying?: boolean
  /**
   * 表格的可访问名（读屏用来区分"这一张表是干什么的"）。
   *
   * <p>同页面常有主表 + 明细表两张 `<table>`，此前都没有 `aria-label`/`caption`，
   * 读屏只能念"表格"，无法判断当前读的是哪一张（WCAG 1.3.1）。传入业务名
   * （如「销售订单列表」），不要传内部 moduleKey。</p>
   */
  tableLabel?: string
}

function shouldIgnoreRowInteraction(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest(ROW_INTERACTION_EXCLUSION_SELECTOR))
  )
}

export function BusinessGridTable({
  moduleKey,
  columns,
  components,
  rowContextMenus,
  dataSource,
  loading,
  currentPage,
  pageSize,
  rowSelection,
  rowClassName,
  onRowClick,
  onRowDoubleClick,
  expandable,
  hasNextPage: _hasNextPage,
  fetchNextPage: _fetchNextPage,
  isFetchingNextPage: _isFetchingNextPage,
  emptyStateInput,
  isRetrying = false,
  tableLabel,
}: Props) {
  const { t } = useTranslation()
  const shellRef = useRef<HTMLDivElement | null>(null)
  // 测量行(aria-hidden + 0 高)内的可聚焦元素全部退出 Tab 序列; 唯一实现在该 hook 内
  useMeasureRowA11y(shellRef)
  const [scrollY, setScrollY] = useState<number>(MIN_TABLE_BODY_SCROLL_Y)
  const [shellWidth, setShellWidth] = useState(0)
  const sequenceStart = (currentPage - 1) * pageSize
  const tableColumns = useMemo<ColumnsType<ModuleRecord>>(() => {
    /*
     * 序号与勾选列固定左侧: rc-table 的 fix 偏移从**最左列**开始连续计算, 只固定
     * 业务首列而放过这两列, 固定块会从中间开始, 视觉上比不固定更糟。
     * 固定后横向滚动到右侧时, 行标识(序号)与批量选择入口始终可见。
     */
    const sequenceColumn: ColumnsType<ModuleRecord>[number] = {
      key: 'sequence',
      title: t('modules.table.sequence'),
      width: SEQUENCE_COLUMN_WIDTH,
      fixed: 'left',
      align: 'center',
      render: (_value, _record, index) => sequenceStart + index + 1,
    }
    /*
     * 勾选列**不能**在这里展开成对象:
     * `Table.SELECTION_COLUMN` 是 antd 的哨兵值(`{}`), useSelection 用
     * `cloneColumns.includes(SELECTION_COLUMN)` 靠**对象身份**识别它。
     * 展开(`{...Table.SELECTION_COLUMN, ...}`)会造出一个新对象 -> 身份判断失效 ->
     * antd 再插入一列真实勾选列, 于是多出一个 0 宽的幽灵表头
     * (实测: width=0, class 带 fix-start, 文本是"全选当前页所有行", 且把左侧固定块
     * 撑出 96px 的偏移)。勾选列的固定与表头文案都走 `rowSelection` 的官方 API,
     * 见 use-business-grid-table.tsx 的 `fixed` 与 `columnTitle`。
     */
    return rowSelection
      ? [sequenceColumn, Table.SELECTION_COLUMN, ...columns]
      : [sequenceColumn, ...columns]
  }, [rowSelection, sequenceStart, t, columns])

  useLayoutEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof ResizeObserver === 'undefined') return

    let frameId = 0
    const measure = () => {
      const availableHeight = computeTableAvailableHeight(shell.clientHeight)
      if (availableHeight <= 0) return
      const headerHeight =
        shell.querySelector('.ant-table-thead')?.getBoundingClientRect()
          .height || 0
      const nextScrollY = computeTableBodyScrollY(
        availableHeight,
        headerHeight,
        0,
      )
      setScrollY((prev) => (prev === nextScrollY ? prev : nextScrollY))
      const nextShellWidth = shell.clientWidth
      setShellWidth((prev) => (prev === nextShellWidth ? prev : nextShellWidth))
    }
    const scheduleMeasure = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(shell)
    measure()
    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [])

  // 展开行包含额外 DOM，高度由明细内容决定；关闭虚拟滚动避免 rc-table
  // 虚拟布局截断展开内容。
  const isVirtual = dataSource.length > 100 && !expandable

  /*
   * 虚拟模式下必须退掉行组件(见下方 tableComponents), 行右键菜单因此不再可用。
   * 这里给出可见说明, 避免用户以为"右键没反应"是故障; 行级动作仍可从工具栏触达。
   */
  const virtualModeHint =
    isVirtual && rowContextMenus?.size
      ? t('modules.table.virtualModeHint')
      : null

  /*
   * 虚拟滚动时 rc-table 的行容器是 div, 注入真 <tr> 行组件(带行右键菜单的那个)
   * 会产生非法嵌套并打乱虚拟布局, 因此虚拟模式下退掉行组件 —— 行右键在虚拟列表里不可用,
   * 行级动作仍可从工具栏(单选/多选后)触达。
   */
  const tableComponents = useMemo<
    TableProps<ModuleRecord>['components']
  >(() => {
    if (!isVirtual || !components?.body || !('row' in components.body)) {
      return components
    }
    const { row: _row, ...restBody } = components.body
    return { ...components, body: restBody }
  }, [components, isVirtual])

  const scrollX = computeTableScrollX({
    columnWidths: [SEQUENCE_COLUMN_WIDTH, ...columns.map((col) => col.width)],
    containerWidth: shellWidth,
    selectionColumnWidth: rowSelection ? 32 : 0,
  })

  const scroll = buildTableScrollConfig({
    dataLength: dataSource.length,
    isVirtual,
    scrollX,
    scrollY,
    shellWidth,
  })
  const shellStyle = {
    '--module-table-body-height': `${scrollY}px`,
  } as CSSProperties

  const doubleClickCooldownRef = useRef(0)
  const rowClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedRowKeys = rowSelection?.selectedRowKeys?.map((key) =>
    String(key),
  )
  const resolveRowClassName = (record: ModuleRecord) => {
    const classes = [rowClassName(record)]
    if (selectedRowKeys?.includes(String(record.id))) {
      classes.push('module-table-row-selected-border-beam')
    }
    return classes.filter(Boolean).join(' ')
  }

  useEffect(
    () => () => {
      if (rowClickTimerRef.current) {
        clearTimeout(rowClickTimerRef.current)
      }
    },
    [],
  )

  const clearPendingRowClick = () => {
    if (!rowClickTimerRef.current) return
    clearTimeout(rowClickTimerRef.current)
    rowClickTimerRef.current = null
  }

  const onRow = (record: ModuleRecord) => ({
    tabIndex: 0,
    'aria-keyshortcuts': rowSelection ? 'Enter Space' : 'Enter',
    ...(selectedRowKeys
      ? { 'aria-selected': selectedRowKeys.includes(String(record.id)) }
      : {}),
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (shouldIgnoreRowInteraction(event.target)) return
      clearPendingRowClick()
      rowClickTimerRef.current = setTimeout(() => {
        rowClickTimerRef.current = null
        onRowClick(record)
      }, ROW_SINGLE_CLICK_DELAY_MS)
    },
    onDoubleClick: (event: MouseEvent<HTMLElement>) => {
      if (shouldIgnoreRowInteraction(event.target)) return
      clearPendingRowClick()
      const now = Date.now()
      if (now - doubleClickCooldownRef.current < 500) return
      doubleClickCooldownRef.current = now
      onRowDoubleClick(record)
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (shouldIgnoreRowInteraction(event.target)) return
      if (event.key === 'Enter') {
        event.preventDefault()
        clearPendingRowClick()
        onRowDoubleClick(record)
        return
      }
      if (event.key === ' ' && rowSelection) {
        event.preventDefault()
        clearPendingRowClick()
        onRowClick(record)
      }
    },
  })

  /*
   * 状态未知（加载中 / 失败重试中）一律不判定空状态：
   * `hasData: null` 表示"还不知道"，避免在重试窗口里先渲染出「暂无数据」的假空态。
   */
  const stateUnknown = loading || isRetrying
  const emptyState = useEmptyState({
    hasData: stateUnknown ? null : dataSource.length > 0,
    ...emptyStateInput,
  })
  const emptyText =
    isRetrying ? // 重试窗口内保持空白：此时既不是"空"也不是"错"，渲染任一种都是错误信息
    null : emptyState ? (
      <EmptyState
        type={emptyState.type}
        title={emptyState.title}
        description={emptyState.description}
        hint={emptyState.hint}
        primaryAction={emptyState.primaryAction}
        secondaryAction={emptyState.secondaryAction}
      />
    ) : stateUnknown ? /*
     * 加载中 / 重试中不渲染「暂无数据」。
     *
     * <p>此前这里直接兜底 `<Empty>暂无数据</Empty>`：后端 5xx 时 react-query
     * `retry: 1` 的重试窗口里 `error` 仍是 undefined，`emptyStateInput.hasError`
     * 因此为 false，`useEmptyState` 返回 null，于是**先闪 1.2 秒「暂无数据 / 共 0 条」**，
     * 重试彻底失败后才切成错误态。用户会先被告知"没有数据"，再被告知"加载失败"。</p>
     */
    null : (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('modules.table.noData')}
      />
    )
  const locale = { emptyText }

  return (
    <div ref={shellRef} className="module-table-shell" style={shellStyle}>
      {virtualModeHint ? (
        <p
          className="module-grid-virtual-mode-hint"
          data-testid="business-grid-virtual-mode-hint"
        >
          {virtualModeHint}
        </p>
      ) : null}
      {/* 行右键菜单: 行由 components.body.row 渲染, 拿不到行数据, 故用上下文按行 key 注入 */}
      <RowContextMenuContext.Provider value={rowContextMenus ?? null}>
        <Table
          key={moduleKey}
          rowKey="id"
          size="small"
          /* 读屏用表格用途区分同页的主表/明细表（WCAG 1.3.1）；未传时不输出空 aria-label */
          {...(tableLabel ? { 'aria-label': tableLabel } : {})}
          loading={loading}
          columns={tableColumns}
          components={tableComponents}
          dataSource={dataSource}
          rowSelection={rowSelection}
          expandable={
            expandable
              ? {
                  ...expandable,
                  expandIcon: ({ expanded, onExpand, record }) => (
                    <button
                      type="button"
                      className="module-table-expand-button"
                      aria-label={
                        expanded ? t('common.collapse') : t('common.expand')
                      }
                      onClick={(event) => {
                        event.stopPropagation()
                        onExpand(record, event)
                      }}
                    >
                      {expanded ? (
                        <MinusSquareOutlined />
                      ) : (
                        <PlusSquareOutlined />
                      )}
                    </button>
                  ),
                }
              : undefined
          }
          virtual={isVirtual}
          tableLayout="fixed"
          pagination={false}
          scroll={scroll}
          rowClassName={resolveRowClassName}
          onRow={onRow}
          locale={locale}
        />
      </RowContextMenuContext.Provider>
    </div>
  )
}
