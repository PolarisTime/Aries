import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  CSSProperties,
  HTMLAttributes,
  KeyboardEvent,
  ReactNode,
} from 'react'
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { RowContextMenuRow } from '@/components/RowContextMenuRow'
import {
  buildRowDragAccessibility,
  describeRowDragRow,
  type RowDragDescribeRow,
} from './row-drag-a11y'
import { forwardDragListeners } from './row-drag-activation'
import { rowDragCollisionDetection } from './row-drag-collision'
import {
  rowDragActivationConstraint,
  rowDragAriaKeyshortcuts,
  rowDragDirectMoveHintText,
  rowDragKeyboardCodes,
  rowDragKeyboardDelta,
  rowDragKeyboardHintText,
} from './row-drag-config'
import { RowReorderButtons } from './row-reorder-buttons'
import '@/styles/row-drag-sort.css'

/** 落位结果: `nextIds` 已是新顺序, 三个索引供调用方写回行模型并播报。 */
export interface RowDragSortMove {
  rowId: string
  fromIndex: number
  toIndex: number
}

interface RowDragSortContextValue {
  enabled: boolean
  /** 无障碍说明的 id: 行用它做 aria-describedby, 让读屏知道还能用键盘调整顺序。 */
  hintId: string
  activeId: string | null
  overId: string | null
  activeIndex: number
  overIndex: number
  /** 有序 id 顺序(行模型里的数组顺序)。 */
  rowIds: readonly string[]
  /** 行名提供者(物料名), 播报与按钮可访问名共用。 */
  describeRow?: RowDragDescribeRow
  /**
   * 移动一行: 返回**是否真的移动了**。边界项(首行上移/末行下移)返回 false,
   * 调用方据此决定要不要 `preventDefault` —— 处理不成功就必须把按键交还浏览器。
   */
  moveRow: (rowId: string, delta: -1 | 1) => boolean
}

const RowDragSortContext = createContext<RowDragSortContextValue | undefined>(
  undefined,
)

export interface RowDragSortScopeProps {
  /** 行的 id 顺序: 即行模型(表单状态)里的数组顺序, 拖动只改它, 不直接动 DOM。 */
  rowIds: string[]
  /** 顺序变化回调: 拖动落位与键盘/按钮移动都走这里写回行模型。 */
  onReorder: (nextIds: string[], move: RowDragSortMove) => void
  /** 是否启用拖动: 只读/上游派生/顺序锁定场景传 false(此时不挂任何拖动监听)。 */
  enabled?: boolean
  /** 行的可读名(物料名等); 拿不到时播报退回「第 N 行」。**禁止返回 id**。 */
  describeRow?: RowDragDescribeRow
  children: ReactNode
}

/**
 * 可编辑明细表的**整行长按拖动排序**共享能力。
 *
 * <p>设计口径(全系统一套, 各表只接线不另写实现):</p>
 * <ol>
 *   <li><b>不加拖动手柄列</b>: 整行就是拖动激活点, 列宽与信息密度不变;</li>
 *   <li><b>长按起拖</b>: 按住满 {@link ROW_DRAG_LONG_PRESS_MS} 毫秒才起拖, 未满阈值前
 *       位移超过 {@link ROW_DRAG_MOVE_TOLERANCE_PX} 像素(滚动/选文本)即取消长按;</li>
 *   <li><b>不抢编辑</b>: 输入框/下拉/数字输入/按钮/选择框上的按下直接放行, 见
 *       {@link isRowDragBlockedTarget};</li>
 *   <li><b>键盘 = ARIA APG 状态机</b>: Space/Enter 拾起 → 方向键移动 → Space/Enter 放下,
 *       Esc 取消(dnd-kit KeyboardSensor); Alt+↑/↓ 是**可选附加直移键**, 不再是唯一键盘
 *       路径。键位清单只有 {@link ROW_DRAG_KEYBOARD_MODEL} 一份, 注册与
 *       `aria-keyshortcuts` 都从它派生;</li>
 *   <li><b>非拖动替代</b>: 每行另有可点击的「上移/下移」按钮
 *       ({@link RowDragSortMoveButtons}, WCAG 2.2 SC 2.5.7), 单指针与纯键盘都能完成重排;</li>
 *   <li><b>读屏可听</b>: 覆写 `accessibility.announcements` 与 `screenReaderInstructions`,
 *       只播报「行名 + 位次」, 绝不播报雪花 id;</li>
 *   <li><b>顺序写回行模型</b>: 只回调新 id 顺序, 由调用方改表单状态, 保存时按数组顺序下发。</li>
 * </ol>
 *
 * <p>输入方式只有鼠标一套(应用只在 Windows/macOS + Chrome/Firefox 使用): 不注册
 * TouchSensor。</p>
 */
export function RowDragSortScope({
  rowIds,
  onReorder,
  enabled = true,
  describeRow,
  children,
}: RowDragSortScopeProps) {
  const { t } = useTranslation()
  const hintId = useId()
  const scopeRef = useRef<HTMLDivElement | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  /** 下一次渲染后要把焦点还给哪一行(键盘移动/落位后焦点必须留在被移动的行上)。 */
  const focusRowIdRef = useRef<string | null>(null)
  /** 行顺序快照: dnd-kit 的事件回调里读它, 避免闭包拿到旧顺序。 */
  const rowIdsRef = useRef(rowIds)
  rowIdsRef.current = rowIds

  const sensors = useSensors(
    // 鼠标: 长按 380ms 起拖, 阈值内位移过大即取消(见 row-drag-config)。
    useSensor(MouseSensor, {
      activationConstraint: rowDragActivationConstraint(),
    }),
    // 键盘: Space/Enter 拾起 → 方向键移动 → Space/Enter 放下, Esc 取消。
    // 键位与 aria-keyshortcuts 同源(ROW_DRAG_KEYBOARD_MODEL), 不再各写一套。
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: rowDragKeyboardCodes(),
    }),
  )

  const accessibility = useMemo(
    () => buildRowDragAccessibility({ rowIds, describeRow, t }),
    [describeRow, rowIds, t],
  )

  const labelOfRow = useCallback(
    (rowId: string) => describeRowDragRow(rowId, { rowIds, describeRow, t }),
    [describeRow, rowIds, t],
  )

  const focusRow = useCallback((rowId: string) => {
    const rows =
      scopeRef.current?.querySelectorAll<HTMLElement>('tr[data-row-key]')
    for (const row of rows ?? []) {
      if (row.dataset.rowKey === rowId) {
        row.focus()
        return
      }
    }
  }, [])

  // 焦点保持: 顺序写回后行元素被复用/重排, 必须按 id 重新聚焦被移动的那一行
  // biome-ignore lint/correctness/useExhaustiveDependencies: rowIds 变化本身就是"顺序已写回、可以重新聚焦"的信号, 效果体内通过 ref 读取它
  useEffect(() => {
    const rowId = focusRowIdRef.current
    if (!rowId) return
    focusRowIdRef.current = null
    focusRow(rowId)
  }, [rowIds, focusRow])

  const applyMove = useCallback(
    (rowId: string, toIndex: number, fromIndex: number) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return false
      const nextIds = arrayMove(rowIdsRef.current, fromIndex, toIndex)
      focusRowIdRef.current = rowId
      onReorder(nextIds, { rowId, fromIndex, toIndex })
      setAnnouncement(
        t('common.rowDragSort.moved', {
          row: labelOfRow(rowId),
          position: toIndex + 1,
        }),
      )
      return true
    },
    [labelOfRow, onReorder, t],
  )

  const moveRow = useCallback(
    (rowId: string, delta: -1 | 1) => {
      const ids = rowIdsRef.current
      const fromIndex = ids.indexOf(rowId)
      // indexOf 为 -1: 该行不在有序集合里(上游刚换数据/被删), 一律不移动也不消费按键
      if (fromIndex < 0) return false
      const toIndex = fromIndex + delta
      if (toIndex < 0 || toIndex >= ids.length) return false
      return applyMove(rowId, toIndex, fromIndex)
    },
    [applyMove],
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
    // 拖动期间禁止文本选择: 长按 380ms 里浏览器可能已经起了选区
    window.getSelection()?.removeAllRanges()
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      setOverId(null)
      if (!over || active.id === over.id) return
      const ids = rowIdsRef.current
      const fromIndex = ids.indexOf(String(active.id))
      const toIndex = ids.indexOf(String(over.id))
      applyMove(String(active.id), toIndex, fromIndex)
    },
    [applyMove],
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setOverId(null)
  }, [])

  const contextValue = useMemo<RowDragSortContextValue>(
    () => ({
      enabled,
      hintId,
      activeId,
      overId,
      activeIndex: activeId === null ? -1 : rowIds.indexOf(activeId),
      overIndex: overId === null ? -1 : rowIds.indexOf(overId),
      rowIds,
      describeRow,
      moveRow,
    }),
    [enabled, hintId, activeId, overId, rowIds, describeRow, moveRow],
  )

  const activeDescendantNote = enabled ? (
    <span className="aries-sr-only" id={hintId}>
      {t('common.rowDragSort.keyboardHint', {
        shortcuts: rowDragKeyboardHintText(),
        direct: rowDragDirectMoveHintText(),
      })}
    </span>
  ) : null

  const body = (
    <div className="row-drag-sort-scope" ref={scopeRef}>
      <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      {activeDescendantNote}
      {/* 落位/键盘移动/按钮移动统一播报: 读屏用户拿不到视觉反馈, 必须听得到"哪一行到了第几位" */}
      <div aria-live="polite" className="aries-sr-only" role="status">
        {announcement}
      </div>
    </div>
  )

  if (!enabled) {
    return (
      <RowDragSortContext.Provider value={contextValue}>
        {body}
      </RowDragSortContext.Provider>
    )
  }

  return (
    <RowDragSortContext.Provider value={contextValue}>
      <DndContext
        accessibility={accessibility}
        collisionDetection={rowDragCollisionDetection}
        sensors={sensors}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
      >
        {body}
      </DndContext>
    </RowDragSortContext.Provider>
  )
}

/**
 * 行内「上移 / 下移」按钮(拖动排序的**单指针非拖动替代**, WCAG 2.2 SC 2.5.7)。
 *
 * <p>挂在 {@link RowDragSortScope} 内部任意位置即可; 首/末项的按钮自动 `aria-disabled`。
 * 点击与键盘回车走的是与拖动落位完全相同的 {@link RowDragSortContextValue.moveRow},
 * 因此"菜单能移、拖动不能移"这类口径漂移不会再出现。</p>
 */
export interface RowDragSortMoveButtonsProps {
  rowId: string
  /** 覆盖可访问名里的行名; 默认按 describeRow + 序号派生。 */
  label?: string
  className?: string
}

export function RowDragSortMoveButtons({
  rowId,
  label,
  className,
}: RowDragSortMoveButtonsProps) {
  const context = use(RowDragSortContext)
  const { t } = useTranslation()
  if (!context?.enabled) return null
  const index = context.rowIds.indexOf(rowId)
  // 不在有序集合里的行没有"上一位/下一位", 不渲染按钮而不是渲染两个禁用按钮
  if (index < 0) return null
  const rowLabel =
    label ??
    describeRowDragRow(rowId, {
      rowIds: context.rowIds,
      describeRow: context.describeRow,
      t,
    })
  return (
    <RowReorderButtons
      canMoveDown={index < context.rowIds.length - 1}
      canMoveUp={index > 0}
      className={className}
      label={rowLabel}
      onMove={(delta) => {
        context.moveRow(rowId, delta)
      }}
    />
  )
}

interface RowDragSortRowProps extends HTMLAttributes<HTMLTableRowElement> {
  'data-row-key'?: string
}

/** 网格行(非表格)的 props: 与表格行同一套拖动/键盘契约。 */
export interface RowDragSortItemProps extends HTMLAttributes<HTMLDivElement> {
  /** 行标识: 与传给 scope 的 rowIds 一一对应。 */
  rowKey: string
}

/**
 * 行级可排序状态: 表格行与网格行共用的同一份实现。
 *
 * <p>明细不一定长在 antd Table 里(附加费用是 grid 布局的 div 行), 但"长按拖动 +
 * 键盘状态机 + 可点击上移/下移 + 播报 + 焦点保持"的口径必须完全一致, 因此这里只抽
 * 状态与副作用, 元素形态由两个薄封装({@link RowDragSortRow} / {@link RowDragSortItem})
 * 决定。</p>
 */
function useRowDragSortItem(rowId: string | undefined) {
  const context = use(RowDragSortContext)
  const enabled = Boolean(context?.enabled && rowId)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: rowId ?? '', disabled: !enabled })

  const dragListeners = useMemo(
    () => forwardDragListeners(listeners),
    [listeners],
  )

  /**
   * 指针监听与键盘监听必须分开: 行上已有一个 `onKeyDown`(Shift+F10 行菜单 + 可选直移键),
   * 整份展开会把 dnd-kit 的键盘拾起监听覆盖掉 —— 表现为"空格拾起静默失效"。
   */
  const dragKeyDown = dragListeners.onKeyDown as
    | ((event: KeyboardEvent<HTMLElement>) => void)
    | undefined
  const pointerListeners = useMemo(() => {
    const { onKeyDown: _onKeyDown, ...rest } = dragListeners
    return rest
  }, [dragListeners])

  /**
   * dnd-kit 的 `attributes` 里 `role="button"` / `aria-pressed` 挂到 `&lt;tr&gt;` 上会破坏
   * 表格语义(行必须是 row, 且 row 不允许 aria-pressed), 读屏将读不出表格结构。
   * 因此这里**只取** `aria-describedby`(dnd-kit 渲染的操作说明 id), 其余一律不透传;
   * 行是否可聚焦由 tabIndex 决定, 键位声明由 rowDragAria 统一派生。
   */
  const dragDescribedById = attributes['aria-describedby']

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented) return
    if (!enabled || !rowId || !context) return
    // dnd-kit 键盘拖动进行中时由它接管方向键, 此时不再二次移动(否则一次按键移动两格)
    if (context.activeId !== null) return
    // 直移键只有 row-drag-config 一个出口: 只认清单里的 Alt+↑/↓,
    // 空格/单独方向键/带 Ctrl/Meta/Shift 的组合一律不处理(交还浏览器)
    const delta = rowDragKeyboardDelta(event)
    if (delta === undefined) return
    // **只有真的移动了才 preventDefault**: 首行再按 Alt+↑ 时不消费按键,
    // 浏览器该做什么还做什么(与"处理成功才 preventDefault"的口径一致)
    if (context.moveRow(rowId, delta)) event.preventDefault()
  }

  /** 插入位置指示线: 向上拖画在目标行上方, 向下拖画在下方(落位方向与线一致)。 */
  const insertion =
    enabled && isOver && !isDragging && context
      ? context.activeIndex < context.overIndex
        ? ' row-drag-sort-row--over-below'
        : context.activeIndex > context.overIndex
          ? ' row-drag-sort-row--over-above'
          : ''
      : ''

  const className = [
    enabled ? 'row-drag-sort-row' : '',
    isDragging ? 'row-drag-sort-row--dragging' : '',
    insertion,
  ]
    .filter(Boolean)
    .join(' ')

  const style: CSSProperties = {
    transform: transform
      ? CSS.Transform.toString({ ...transform, x: 0 })
      : undefined,
    transition,
  }

  return {
    context,
    dragDescribedById,
    dragKeyDown,
    enabled,
    handleKeyDown,
    pointerListeners,
    className,
    style,
    setNodeRef,
  }
}

/**
 * 拖动相关无障碍属性的公共拼装(表格行与网格行一致)。
 *
 * <p>`aria-keyshortcuts` 由键位常量派生; `aria-describedby` 同时指向本行提示与 dnd-kit
 * 渲染的操作说明(dnd-kit 的 attributes 里已带那个 id), 读屏两段都能读到。</p>
 */
function rowDragAria(
  enabled: boolean,
  hintId: string | undefined,
  originalShortcuts: string | undefined,
  dndDescribedById: string | undefined,
) {
  return {
    'aria-describedby': enabled
      ? [hintId, dndDescribedById].filter(Boolean).join(' ') || undefined
      : undefined,
    'aria-keyshortcuts': enabled
      ? rowDragAriaKeyshortcuts(originalShortcuts)
      : originalShortcuts,
  }
}

/**
 * 可排序表格行: 挂在 antd Table 的 `components.body.row` 上。
 *
 * <p>刻意**不透传 dnd-kit 的 `role`**: `role="button"` 挂在 `&lt;tr&gt;` 上会破坏表格语义
 * (行必须是 row), 读屏将读不出表格结构。键盘操作走 {@link ROW_DRAG_KEYBOARD_MODEL} 的
 * Space/Enter 状态机(由 dnd-kit 的 KeyboardSensor 提供), 直移 Alt+↑/↓ 作为可选附加键;
 * 单指针则用行内「上移/下移」按钮 —— 那是 SC 2.5.7 要求的非拖动替代。</p>
 */
export function RowDragSortRow(props: RowDragSortRowProps) {
  const item = useRowDragSortItem(props['data-row-key'])
  const { onKeyDown, ...rest } = props

  return (
    <RowContextMenuRow
      {...rest}
      {...item.pointerListeners}
      {...rowDragAria(
        item.enabled,
        item.context?.hintId,
        rest['aria-keyshortcuts'],
        item.dragDescribedById,
      )}
      ref={item.setNodeRef}
      className={[rest.className, item.className].filter(Boolean).join(' ')}
      // 长按让给整行拖动, 因此关闭行菜单的触摸长按入口(右键与 Shift+F10 仍在)
      longPressToOpen={!item.enabled}
      style={{ ...rest.style, ...item.style }}
      tabIndex={item.enabled ? (rest.tabIndex ?? 0) : rest.tabIndex}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        // dnd-kit 的空格/回车拾起与放下
        item.dragKeyDown?.(event)
        // 可选附加直移键(Alt+↑/↓)
        item.handleKeyDown(event)
      }}
    />
  )
}

/**
 * 可排序网格行: 明细不是 antd Table 而是 div 网格时用它(如附加费用明细)。
 *
 * <p>与表格行共用同一份拖动激活、键盘状态机、非拖动替代与播报口径, 区别只在元素形态 ——
 * 这样"所有明细表都能长按拖动"才是同一套行为, 而不是每张表各写一遍。</p>
 */
export function RowDragSortItem({
  rowKey,
  children,
  ...rest
}: RowDragSortItemProps) {
  const item = useRowDragSortItem(rowKey)
  const { onKeyDown, ...restProps } = rest

  return (
    <div
      {...restProps}
      {...item.pointerListeners}
      {...rowDragAria(
        item.enabled,
        item.context?.hintId,
        rest['aria-keyshortcuts'],
        item.dragDescribedById,
      )}
      ref={item.setNodeRef}
      className={[rest.className, item.className].filter(Boolean).join(' ')}
      style={{ ...rest.style, ...item.style }}
      tabIndex={item.enabled ? (rest.tabIndex ?? 0) : rest.tabIndex}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        item.dragKeyDown?.(event)
        item.handleKeyDown(event)
      }}
    >
      {children}
    </div>
  )
}
