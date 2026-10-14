import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties, HTMLAttributes } from 'react'
import { useMemo } from 'react'
import { RowContextMenuRow } from '@/components/RowContextMenuRow'
import { rowDragAriaKeyshortcuts } from '@/components/table/row-drag'
import { ITEM_DRAG_TYPE } from './pickup-list-draft'
import { forwardDragListeners } from './pickup-list-drag-activation'

interface SortableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string
}

/**
 * 单条明细行: 整行既是行菜单(右键 / Shift+F10)的触发器, 也是拖动排序的激活点。
 *
 * <p>设计取舍(取消可见拖动手柄后):</p>
 * <ul>
 *   <li>鼠标: 长按 380ms 起拖(阈值取共享的 rowDragActivationConstraint(), 与整行拖动同一套),
 *     期间位移超过容差即取消, 单纯点击不受影响;</li>
 *   <li>无触摸版: 应用只在 Windows/macOS + Chrome/Firefox 使用, 不再注册 TouchSensor;</li>
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
   * 拖动激活监听: 按传感器实际声明的键整体转发(见 forwardDragListeners 的说明,
   * 硬编码键名会在更换传感器时静默失效), 输入控件上一律放行。
   */
  const dragListeners = useMemo(
    () => forwardDragListeners(listeners),
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
      // 键位从共享常量派生(拾起键 + 可选 Alt 直移键), 再追加行菜单的 Shift+F10
      aria-keyshortcuts={rowDragAriaKeyshortcuts('Shift+F10')}
    />
  )
}
