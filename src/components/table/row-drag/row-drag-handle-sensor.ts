import { PointerSensor } from '@dnd-kit/core'
import { ROW_DRAG_HANDLE_SELECTOR } from './row-drag-config'

/**
 * 拖动手柄专用的**即时起拖**传感器。
 *
 * <p>为什么需要它：行拖动原本只有「按住 380ms 长按」一套口径（见 `row-drag-config`），
 * 那是为了不抢整行上的输入框与文本划选。但顺序列上摆着一个画着 `⋮⋮` 的抓动手柄，
 * 用户的直觉是「抓住这里就能拖」—— 按下即拖才是手柄的语义。实测反馈：从手柄上按下直接
 * 拖动，长按未满阈值就位移超过容差 → 传感器取消 → 浏览器把整行文字**划选**成一片蓝色，
 * 之后既没拖动、选区还留着，看起来就是「点了手柄整行变蓝、再点没反应」。</p>
 *
 * <p>因此手柄走这条独立通路：`onPointerDown` 命中手柄就**立刻**激活拖动
 * （不注册 `activationConstraint`，即无延迟、无位移阈值），并在同一个事件上
 * `preventDefault()` 阻止浏览器起选区。行其它位置仍然走 {@link MouseSensor} 的
 * 380ms 长按，两套输入互不干扰：</p>
 * <ul>
 *   <li>事件名不同（`onPointerDown` vs `onMouseDown`），dnd-kit 的合成监听不会互相覆盖；</li>
 *   <li>dnd-kit 在激活时会给原生事件打 `dndKit` 标记并记录 `activeRef`，同一次按下里
 *       随后到达的 `mousedown` 会被它自己跳过，不会二次起拖。</li>
 * </ul>
 *
 * <p>基类用 {@link PointerSensor}（收尾事件是 `pointerup`）而不是 `MouseSensor`：
 * 这里对 `pointerdown` 调了 `preventDefault()`，若收尾还等 `mouseup`，一旦某个浏览器
 * 把兼容鼠标事件一并抑制，拖动就会一直挂在「进行中」状态。</p>
 */
export class RowDragHandleSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (event: unknown): boolean => {
        const native = (event as { nativeEvent?: PointerEvent }).nativeEvent
        if (!native) return false
        // 只认主指针的左键：右键/中键、以及多指的第二根手指都不该起拖
        if (native.isPrimary === false || native.button !== 0) return false
        const target = native.target
        if (!(target instanceof Element)) return false
        if (!target.closest(ROW_DRAG_HANDLE_SELECTOR)) return false

        // 手柄上按下即起拖：同时阻止浏览器从这一刻开始划选整行文本
        native.preventDefault()
        return true
      },
    },
  ]
}
