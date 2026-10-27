import { Empty, Table } from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
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
  computeTableScrollX,
  distributeSurplusWidth,
  shouldIgnoreRowInteraction,
  sumColumnWidths,
} from '@/views/modules/components/business-grid-table-utils'
import {
  RowIdentityCell,
  RowIdentityHeader,
} from '@/views/modules/components/RowIdentityCell'
import { useTableBodyScrollY } from '@/views/modules/components/use-table-body-scroll-y'
import { useTableRowRangeSelect } from '@/views/modules/components/use-table-row-range-select'

const ROW_SINGLE_CLICK_DELAY_MS = 220
/**
 * 首位「身份列」宽度 —— 两组控件：序号⇄勾选 + 行内动作组（明细加号 | 行菜单）。
 *
 * <p>演进：最初是**四列**（序号 64 + 勾选 32 + 明细加号 48 + 行尾操作 40 = 184px），
 * 每列只装一个 16~24px 的小图标，横向一片竖线读起来"散"；第二步并成一列（128px）；
 * 现在把「序号」与「勾选」合成同一个槽位（悬停/勾选时互换），两个图标拼成一组，
 * 横向预算再降到 96px —— 相对最初省下 88px，全部让给业务列。</p>
 *
 * <p>72 = 左右内边距 16 + 选择器槽位 26 + 间隙 4 + 明细按钮 24 + 余量 2。
 * 可点目标都保持 ≥24×24（WCAG 2.2 SC 2.5.8）。</p>
 *
 * <p>行菜单的可见「⋮」按钮已移除（使用者要求）：行级命令在工具栏 / 勾选横幅里都有同一份
 * 入口，行菜单仍可由右键、触摸长按、键盘 Shift+F10 打开，因此少这 24px 不丢能力。</p>
 */
export const IDENTITY_COLUMN_WIDTH = 72

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
  /**
   * 行选择配置。**首位身份列由它承载**（序号 · 勾选 · 明细加号 · 行菜单合成一格），
   * 因此不传时既没有勾选入口、也没有行序号 —— 业务网格的调用方始终会传
   * （见 `useBusinessGridTable` 的 `rowSelection`）。
   */
  rowSelection?: TableProps<ModuleRecord>['rowSelection']
  rowClassName: (record: ModuleRecord) => string
  onRowClick: (record: ModuleRecord) => void
  onRowDoubleClick: (record: ModuleRecord) => void
  expandable?: TableProps<ModuleRecord>['expandable']
  /**
   * 明细按钮渲染器（口径在 `useGridColumns`）。
   *
   * <p>传入时渲染在首位身份列里，此时不再渲染 antd 原生展开列（否则同一屏两个展开入口）；
   * 不传时保留原生展开列，作为该组件单独使用时的兜底。</p>
   */
  renderRowDetailToggle?: (record: ModuleRecord) => ReactNode
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
  renderRowDetailToggle,
  hasNextPage: _hasNextPage,
  fetchNextPage: _fetchNextPage,
  isFetchingNextPage: _isFetchingNextPage,
  emptyStateInput,
  isRetrying = false,
  tableLabel,
}: Props) {
  const { t } = useTranslation()
  /*
   * 外壳高度/宽度测量收敛在 `useTableBodyScrollY` 一处（主数据、财务、明细表也用它）：
   * `scrollY` 给表体定高，`shellWidth` 用来判断是否需要横向滚动。
   */
  const { shellRef, scrollY, shellWidth, bodyWidth, shellStyle } =
    useTableBodyScrollY()
  // 测量行(aria-hidden + 0 高)内的可聚焦元素全部退出 Tab 序列; 唯一实现在该 hook 内
  useMeasureRowA11y(shellRef)
  const sequenceStart = (currentPage - 1) * pageSize
  /*
   * 按住拖拽批量勾选（Windows 资源管理器式）：结果走 `rowSelection.onChange`，
   * 与勾选框、Space 键点选是同一个出口。触屏不参与（拖动留给滚动）。
   */
  const rangeSelect = useTableRowRangeSelect({
    containerRef: shellRef,
    dataSource,
    rowSelection,
  })

  /*
   * 勾选列 = 首位身份列：序号 / 行复选框 / 明细按钮 / 行菜单合成一格。
   *
   * <p>为什么仍由 antd 的 selection 列承载：全选与半选、Shift 连选、每行复选框的可访问名
   * （「选择此行：<单号>」来自 `getCheckboxProps`）都是 antd 的实现；自己画复选框就得把这
   * 套语义整抄一遍。`renderCell` 的第四个参数就是 antd 生成的 `originNode`（真正的
   * Checkbox），这里只负责摆放；`columnTitle` 的函数式写法拿到的是表头全选复选框，
   * 把它和「序号」放进同一格。</p>
   *
   * <p>**不能**在 columns 里展开 `Table.SELECTION_COLUMN`（哨兵对象 `{}`，antd 按对象身份
   * 识别）：展开会再插一列 0 宽幽灵表头。固定方向/宽度/表头都走 `rowSelection` 官方 API。</p>
   */
  const identityRowSelection = useMemo<
    TableProps<ModuleRecord>['rowSelection'] | undefined
  >(() => {
    if (!rowSelection) return rowSelection
    return {
      ...rowSelection,
      fixed: 'start',
      columnWidth: IDENTITY_COLUMN_WIDTH,
      columnTitle: (selectAllNode: ReactNode) => (
        <RowIdentityHeader
          label={t('modules.table.sequence')}
          selectAll={selectAllNode}
        />
      ),
      renderCell: (checked, record, index, originNode) => (
        <RowIdentityCell
          sequenceNumber={sequenceStart + index + 1}
          checkbox={originNode}
          detailToggle={renderRowDetailToggle?.(record) ?? null}
          selected={checked}
        />
      ),
    }
  }, [rowSelection, renderRowDetailToggle, sequenceStart, t])

  /*
   * 列宽合计不足表体宽度时，把富余量**只**给最后一列。
   *
   * 不做这一步的话，`table-layout: fixed` 会把富余按比例摊到每一列：身份列（勾选/序号那格）
   * 也会被撑宽（实测 72 → 92.3），看着就是"这列还是有宽度"。
   * 用表体宽（不含纵向滚动条占位）作为可用宽度，否则分出去的富余会被滚动条再挤出横向滚动条。
   */
  const availableWidth = bodyWidth > 0 ? bodyWidth : shellWidth
  const contentWidth =
    sumColumnWidths(columns.map((column) => column.width)) +
    (identityRowSelection ? IDENTITY_COLUMN_WIDTH : 0)
  const surplusWidth =
    availableWidth > 0 && contentWidth < availableWidth
      ? availableWidth - contentWidth
      : 0

  const tableColumns = useMemo<ColumnsType<ModuleRecord>>(() => {
    /*
     * 先摊到业务列，再拼身份列：`Table.SELECTION_COLUMN` 是哨兵对象 `{}`，
     * 展开/替换它会让 antd 的 `cloneColumns.includes()` 身份判断失效（多一列幽灵表头）。
     */
    const widenedColumns = distributeSurplusWidth(columns, surplusWidth)
    return (
      identityRowSelection
        ? [Table.SELECTION_COLUMN, ...widenedColumns]
        : widenedColumns
    ) as ColumnsType<ModuleRecord>
  }, [identityRowSelection, columns, surplusWidth])

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
    columnWidths: columns.map((col) => col.width),
    containerWidth: availableWidth,
    selectionColumnWidth: identityRowSelection ? IDENTITY_COLUMN_WIDTH : 0,
  })

  const scroll = buildTableScrollConfig({
    dataLength: dataSource.length,
    isVirtual,
    scrollX,
    scrollY,
    shellWidth,
  })
  const tableShellStyle = {
    ...shellStyle,
    /* 身份列宽度同时也由 rowSelection.columnWidth 落到 colgroup；这里给 CSS 一份同步值，
       让 `.ant-table-selection-column` 的宽度覆盖规则不必再写死 40px。 */
    '--module-selection-column-width': `${IDENTITY_COLUMN_WIDTH}px`,
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

  const onRow = (record: ModuleRecord, index = 0) => ({
    tabIndex: 0,
    /*
     * 只声明 Enter / Space：行菜单的键盘入口 `Shift+F10` 由 `RowContextMenuRow` 统一追加
     * （它把收到的值和自己的拼起来），这里再写一遍会得到「Shift+F10 Shift+F10」。
     */
    'aria-keyshortcuts': rowSelection ? 'Enter Space' : 'Enter',
    ...(selectedRowKeys
      ? { 'aria-selected': selectedRowKeys.includes(String(record.id)) }
      : {}),
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      rangeSelect.onRowPointerDown(event, index)
    },
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (shouldIgnoreRowInteraction(event.target)) return
      // 拖拽框选收尾的那一次 click 不再当作"点选这一行"
      if (rangeSelect.consumeClickSuppression()) return
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
    <div
      ref={shellRef}
      className={
        rangeSelect.isRangeSelecting
          ? 'module-table-shell is-row-drag-selecting'
          : 'module-table-shell'
      }
      style={tableShellStyle}
    >
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
          rowSelection={identityRowSelection}
          expandable={
            expandable
              ? {
                  ...expandable,
                  /*
                   * 明细展开入口统一在首位身份列（`renderRowDetailToggle`）：不关掉原生展开列
                   * 的话，同一行会出现两个「+」（一个在身份列、一个在原生展开列）。
                   * 没传渲染器时保留调用方的设置，作为该组件单独使用时的兜底。
                   */
                  showExpandColumn: renderRowDetailToggle
                    ? false
                    : expandable.showExpandColumn,
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
