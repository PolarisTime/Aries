/**
 * 行拖动排序的共享激活参数(取消可见拖动手柄后的"长按起拖"口径)。
 *
 * <p>整行就是拖动区之后, 行上铺着数量/备注等输入控件, 用户还可能用手指滚动列表、
 * 用鼠标划选文本。若"按下即起拖", 这些正常操作全会被拖动劫持, 因此统一要求:</p>
 * <ul>
 *   <li>按住不动满 {@link ROW_DRAG_LONG_PRESS_MS} 毫秒才起拖;</li>
 *   <li>还没到阈值就位移超过 {@link ROW_DRAG_MOVE_TOLERANCE_PX} 像素(想滚动/想选文本)
 *       立即取消长按, 交还原生行为。</li>
 * </ul>
 *
 * <p>阈值与容差只在这里定义一处: 鼠标、触摸、各表接线都取同一份, 避免"某张表的拖动
 * 忽然变得很容易误触"这种各处一份参数导致的分叉。</p>
 */
export const ROW_DRAG_LONG_PRESS_MS = 380

/** 长按期间允许的抖动像素: 超过即取消长按(避免手滑把点击/滚动变成拖动)。 */
export const ROW_DRAG_MOVE_TOLERANCE_PX = 5

/** dnd-kit 的延迟激活约束(`{ delay, tolerance }`), 单位分别为毫秒与像素。 */
export interface RowDragActivationConstraint {
  delay: number
  tolerance: number
}

/**
 * 长按激活约束: 鼠标与触摸用同一份口径。
 *
 * <p>鼠标不用"移动即起拖": 用户点单元格、划选数字都会先移动, 那会把点击也变成拖动;
 * 触摸不用 PointerSensor: 它在触摸下要求 `touch-action: none`, 会让列表无法用手指滚动。
 * 触摸走 TouchSensor 的 `delay` 激活, 滚动照旧。</p>
 */
export function rowDragActivationConstraint(): RowDragActivationConstraint {
  return {
    delay: ROW_DRAG_LONG_PRESS_MS,
    tolerance: ROW_DRAG_MOVE_TOLERANCE_PX,
  }
}
