import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import { forwardDragListeners } from './row-drag-activation'
import { rowDragActivationConstraint } from './row-drag-config'
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
 *   <li><b>键盘等价</b>: 行内可聚焦元素上 Alt+↑/Alt+↓ 上移/下移; 落位与键盘移动都通过
 *       `aria-live` 播报, 焦点保持在被移动的那一行;</li>
 *   <li><b>顺序写回行模型</b>: 只回调新 id 顺序, 由调用方改表单状态, 保存时按数组顺序下发。</li>
 * </ol>
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
    // 鼠标与触摸同一口径: 长按起拖, 阈值内位移过大即取消(触摸因此不劫持列表滚动)
    useSensor(MouseSensor, {
      activationConstraint: rowDragActivationConstraint(),
    }),
    useSensor(TouchSensor, {
      activationConstraint: rowDragActivationConstraint(),
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
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
      {t('common.rowDragSort.keyboardHint')}
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

/**
 * 可排序行: 挂在 antd Table 的 `components.body.row` 上。
 *
 * <p>刻意**不透传 dnd-kit 的 `attributes`**: 它带 `role="button"`, 挂在 `&lt;tr&gt;`
 * 上会破坏表格语义(行必须是 row), 读屏将读不出表格结构。键盘操作因此不走 dnd-kit 的
 * "空格拾起", 而是 Alt+↑/Alt+↓ 直接移动 —— 与拖动等价且不需要进入拖动模式。</p>
 */
export function RowDragSortRow(props: RowDragSortRowProps) {
  const context = use(RowDragSortContext)
  const rowId = props['data-row-key']
  const enabled = Boolean(context?.enabled && rowId)
  const { listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({
      id: rowId ?? '',
      disabled: !enabled,
    })

  const dragListeners = useMemo(
    () => forwardDragListeners(listeners),
    [listeners],
  )

  const { onKeyDown, ...rest } = props
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (!enabled || !rowId || !context) return
    // dnd-kit 键盘拖动进行中时由它接管方向键, 此时不再二次移动(否则一次按键移动两格)
    if (context.activeId !== null) return
    // 只认 Alt+↑/↓: 与 dnd-kit 的空格拾取、antd 数字输入的 ↑/↓ 调值都不冲突
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    context.moveByKeyboard(rowId, event.key === 'ArrowUp' ? -1 : 1)
  }

  const style: CSSProperties = {
    ...rest.style,
    transform: transform
      ? CSS.Transform.toString({ ...transform, x: 0 })
      : undefined,
    transition,
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

  return (
    <RowContextMenuRow
      {...rest}
      {...dragListeners}
      ref={setNodeRef}
      aria-describedby={enabled ? context?.hintId : rest['aria-describedby']}
      /* 键盘用户要能在行上按 Alt+↑/↓: 行本身可聚焦, 行内控件聚焦时按键同样冒泡到这里 */
      aria-keyshortcuts={
        enabled
          ? ['Alt+ArrowUp', 'Alt+ArrowDown', 'Space', rest['aria-keyshortcuts']]
              .filter(Boolean)
              .join(' ')
          : rest['aria-keyshortcuts']
      }
      className={[
        rest.className,
        enabled ? 'row-drag-sort-row' : '',
        isDragging ? 'row-drag-sort-row--dragging' : '',
        insertion,
      ]
        .filter(Boolean)
        .join(' ')}
      // 长按让给整行拖动, 因此关闭行菜单的触摸长按入口(右键与 Shift+F10 仍在)
      longPressToOpen={!enabled}
      style={style}
      tabIndex={enabled ? (rest.tabIndex ?? 0) : rest.tabIndex}
      onKeyDown={handleKeyDown}
    />
  )
}
