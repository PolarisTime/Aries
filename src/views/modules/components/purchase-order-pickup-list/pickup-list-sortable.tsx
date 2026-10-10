import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  CSSProperties,
  HTMLAttributes,
  KeyboardEvent,
  PointerEvent,
  TouchEvent,
} from 'react'
import { useMemo } from 'react'
import { RowContextMenuRow } from '@/components/RowContextMenuRow'
import { ITEM_DRAG_TYPE } from './pickup-list-draft'
import { guard, type Listener } from './pickup-list-drag-activation'

interface SortableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string
}

/**
 * 单条明细行: 整行既是行菜单(右键 / Shift+F10)的触发器, 也是拖动排序的激活点。
 *
 * <p>设计取舍(取消可见拖动手柄后):</p>
 * <ul>
 *   <li>鼠标: 按住后移动 8px 起拖, 单纯点击不受影响;</li>
 *   <li>触摸: 长按 250ms 起拖, 期间移动超过容差即取消, 因此不影响列表滚动;</li>
 *   <li>键盘: 行可聚焦, 空格拾起、方向键移动、空格放下(dnd-kit KeyboardSensor);</li>
 *   <li>长按让给拖动, 因此关闭行菜单的长按入口 —— 菜单仍可用鼠标右键与 Shift+F10,
 *     顺序调整另有右键菜单的「上移/下移」作为非拖动替代(WCAG 2.2 SC 2.5.7)。</li>
 * </ul>
 *
 * <p>刻意不透传 dnd-kit 的 `attributes`: 它带 `role="button"`, 挂在 `&lt;tr&gt;` 上
 * 会破坏表格语义(行必须是 row), 读屏将读不出表格结构。</p>
 */
export function SortableRow(props: SortableRowProps) {
  const {
    attributes: _attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key'],
    data: { type: ITEM_DRAG_TYPE },
  })

  /**
   * 输入控件上不启动拖动: 行内铺满数量/备注等输入, 在它们上长按或按住拖动
   * 应当仍然用于选择文本与编辑, 而不是把整行拖走。
   */
  const dragListeners = useMemo(
    () => ({
      onPointerDown: guard(
        listeners?.onPointerDown as Listener<PointerEvent<HTMLTableRowElement>>,
      ),
      onTouchStart: guard(
        listeners?.onTouchStart as Listener<TouchEvent<HTMLTableRowElement>>,
      ),
      onKeyDown: listeners?.onKeyDown as Listener<
        KeyboardEvent<HTMLTableRowElement>
      >,
    }),
    [listeners],
  )

  const style: CSSProperties = {
    ...props.style,
    transform: transform
      ? CSS.Transform.toString({ ...transform, x: 0 })
      : undefined,
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 2, opacity: 0.72 } : {}),
  }

  return (
    <RowContextMenuRow
      {...props}
      {...dragListeners}
      ref={setNodeRef}
      className={`${props.className || ''}${isDragging ? ' purchase-pickup-list-row--dragging' : ''}`}
      longPressToOpen={false}
      style={style}
      // 键盘拖动用空格拾起, 与行菜单的 Shift+F10 一并声明
      aria-keyshortcuts="Space Shift+F10"
    />
  )
}
