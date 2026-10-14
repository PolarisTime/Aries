import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
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
import { forwardDragListeners } from './row-drag-activation'
import {
  ROW_DRAG_KEYBOARD_SHORTCUTS,
  rowDragActivationConstraint,
  rowDragAriaKeyshortcuts,
  rowDragKeyboardDelta,
  rowDragKeyboardHintText,
} from './row-drag-config'
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
  /** 键盘 Alt+↑/Alt+↓ 的非拖动替代(SC 2.5.7: 不用拖动也能完成同一件事)。 */
  moveByKeyboard: (rowId: string, delta: -1 | 1) => void
}

const RowDragSortContext = createContext<RowDragSortContextValue | undefined>(
  undefined,
)

export interface RowDragSortScopeProps {
  /** 行的 id 顺序: 即行模型(表单状态)里的数组顺序, 拖动只改它, 不直接动 DOM。 */
  rowIds: string[]
  /** 顺序变化回调: 拖动落位与键盘移动都走这里写回行模型。 */
  onReorder: (nextIds: string[], move: RowDragSortMove) => void
  /** 是否启用拖动: 只读/上游派生/顺序锁定场景传 false(此时不挂任何拖动监听)。 */
  enabled?: boolean
  /** 播报用的行名, 默认「第 N 行」。 */
  describeRow?: (index: number) => string
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
 *   <li><b>键盘等价</b>: 行内可聚焦元素上 Alt+↑/Alt+↓ 上移/下移(键位清单只在
 *       {@link ROW_DRAG_KEYBOARD_SHORTCUTS} 一份, 声明与实现同源); 落位与键盘移动都通过
 *       `aria-live` 播报, 焦点保持在被移动的那一行;</li>
 *   <li><b>顺序写回行模型</b>: 只回调新 id 顺序, 由调用方改表单状态, 保存时按数组顺序下发。</li>
 * </ol>
 *
 * <p>输入方式只有鼠标一套(应用只在 Windows/macOS + Chrome/Firefox 使用): 不注册
 * TouchSensor, 也不注册 dnd-kit 的 KeyboardSensor(空格拾起已作废, 键盘调整顺序走上面的
 * Alt+↑/↓)。因此 `aria-keyshortcuts` 里也不会再出现 `Space`。</p>
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
    // 单一鼠标口径(见 row-drag-config): 长按 380ms 起拖, 阈值内位移过大即取消。
    // 不再注册 TouchSensor(无触摸场景), 也不再注册 KeyboardSensor(空格拾起作废)
    useSensor(MouseSensor, {
      activationConstraint: rowDragActivationConstraint(),
    }),
  )

  const labelOf = useCallback(
    (index: number) =>
      describeRow?.(index) ??
      t('common.rowDragSort.rowLabel', { index: index + 1 }),
    [describeRow, t],
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
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return
      const nextIds = arrayMove(rowIdsRef.current, fromIndex, toIndex)
      focusRowIdRef.current = rowId
      onReorder(nextIds, { rowId, fromIndex, toIndex })
      setAnnouncement(
        t('common.rowDragSort.moved', {
          row: labelOf(fromIndex),
          position: toIndex + 1,
        }),
      )
    },
    [labelOf, onReorder, t],
  )

  const moveByKeyboard = useCallback(
    (rowId: string, delta: -1 | 1) => {
      const fromIndex = rowIdsRef.current.indexOf(rowId)
      if (fromIndex < 0) return
      const toIndex = fromIndex + delta
      if (toIndex < 0 || toIndex >= rowIdsRef.current.length) return
      applyMove(rowId, toIndex, fromIndex)
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
      moveByKeyboard,
    }),
    [enabled, hintId, activeId, overId, rowIds, moveByKeyboard],
  )

  const activeDescendantNote = enabled ? (
    <span className="aries-sr-only" id={hintId}>
      {t('common.rowDragSort.keyboardHint', {
        shortcuts: rowDragKeyboardHintText(),
      })}
    </span>
  ) : null

  const body = (
    <div className="row-drag-sort-scope" ref={scopeRef}>
      <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      {activeDescendantNote}
      {/* 落位/键盘移动统一播报: 读屏用户拿不到拖动的视觉反馈, 必须听得到"第几行到了第几位" */}
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
        collisionDetection={closestCenter}
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
 * Alt+↑↓ + 播报 + 焦点保持"的口径必须完全一致, 因此这里只抽状态与副作用,
 * 元素形态由两个薄封装({@link RowDragSortRow} / {@link RowDragSortItem})决定。</p>
 */
function useRowDragSortItem(rowId: string | undefined) {
  const context = use(RowDragSortContext)
  const enabled = Boolean(context?.enabled && rowId)
  const { listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: rowId ?? '', disabled: !enabled })

  const dragListeners = useMemo(
    () => forwardDragListeners(listeners),
    [listeners],
  )

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented) return
    if (!enabled || !rowId || !context) return
    // dnd-kit 键盘拖动进行中时由它接管方向键, 此时不再二次移动(否则一次按键移动两格)
    if (context.activeId !== null) return
    // 键位只有 row-drag-config 一个出口: 只认清单里的组合, 空格/单独方向键一律不处理
    const delta = rowDragKeyboardDelta(event)
    if (delta === undefined) return
    event.preventDefault()
    context.moveByKeyboard(rowId, delta)
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
    dragListeners,
    enabled,
    handleKeyDown,
    className,
    style,
    setNodeRef,
  }
}

/** 拖动相关无障碍属性的公共拼装(表格行与网格行一致)。 */
function rowDragAria(
  enabled: boolean,
  hintId: string | undefined,
  originalShortcuts: string | undefined,
) {
  return {
    'aria-describedby': enabled ? hintId : undefined,
    /* 键盘用户要能在行上按 Alt+↑/↓: 行本身可聚焦, 行内控件聚焦时按键同样冒泡到这里。
       声明直接由键位清单拼出(见 row-dragAriaKeyshortcuts), 不再手写一套键位 */
    'aria-keyshortcuts': enabled
      ? rowDragAriaKeyshortcuts(originalShortcuts)
      : originalShortcuts,
  }
}

/**
 * 可排序表格行: 挂在 antd Table 的 `components.body.row` 上。
 *
 * <p>刻意**不透传 dnd-kit 的 `attributes`**: 它带 `role="button"`, 挂在 `&lt;tr&gt;`
 * 上会破坏表格语义(行必须是 row), 读屏将读不出表格结构。键盘操作因此不走 dnd-kit 的
 * "空格拾起"(KeyboardSensor 已不再注册), 而是 Alt+↑/Alt+↓ 直接移动 —— 与拖动等价且不需要
 * 进入拖动模式。`aria-keyshortcuts` 与提示文案都由键位清单派生, 见
 * {@link ROW_DRAG_KEYBOARD_SHORTCUTS}。</p>
 */
export function RowDragSortRow(props: RowDragSortRowProps) {
  const item = useRowDragSortItem(props['data-row-key'])
  const { onKeyDown, ...rest } = props

  return (
    <RowContextMenuRow
      {...rest}
      {...item.dragListeners}
      {...rowDragAria(
        item.enabled,
        item.context?.hintId,
        rest['aria-keyshortcuts'],
      )}
      ref={item.setNodeRef}
      className={[rest.className, item.className].filter(Boolean).join(' ')}
      // 长按让给整行拖动, 因此关闭行菜单的触摸长按入口(右键与 Shift+F10 仍在)
      longPressToOpen={!item.enabled}
      style={{ ...rest.style, ...item.style }}
      tabIndex={item.enabled ? (rest.tabIndex ?? 0) : rest.tabIndex}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        item.handleKeyDown(event)
      }}
    />
  )
}

/**
 * 可排序网格行: 明细不是 antd Table 而是 div 网格时用它(如附加费用明细)。
 *
 * <p>与表格行共用同一份拖动激活、键盘替代与播报口径, 区别只在元素形态 ——
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
      {...item.dragListeners}
      {...rowDragAria(
        item.enabled,
        item.context?.hintId,
        rest['aria-keyshortcuts'],
      )}
      ref={item.setNodeRef}
      className={[rest.className, item.className].filter(Boolean).join(' ')}
      style={{ ...rest.style, ...item.style }}
      tabIndex={item.enabled ? (rest.tabIndex ?? 0) : rest.tabIndex}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        item.handleKeyDown(event)
      }}
    >
      {children}
    </div>
  )
}
