import { isEditableFieldTarget } from '@/components/row-context-menu'

/** 单个 dnd-kit 监听器的可空形态。 */
export type Listener<E> = ((event: E) => void) | undefined

/** 转发后的监听器集合: 键名与传感器声明的一致。 */
export type ForwardedListeners = Record<string, (event: never) => void>

/**
 * 只在非输入控件上启动拖动。
 *
 * <p>取消可见拖动手柄后, 拖动激活点变成整行/整分组头, 其上铺着数量、备注等输入控件。
 * 若不加拦截, 在输入框内长按或按住拖动会被 dnd-kit 当成"拖动整行", 用户就没法选文本、
 * 也没法按住连续调节数字; 键盘同理 —— 在备注框里敲空格不应该开始拖动。</p>
 *
 * <p>判定复用行菜单同一套口径({@link isEditableFieldTarget}):
 * 只有**正在编辑**的文本/数字输入与下拉算输入控件, 已禁用/只读的不算 ——
 * 否则禁用态输入会变成"拖不动的死区"。</p>
 */
export function guard<E extends { target: EventTarget | null }>(
  handler: Listener<E>,
): Listener<E> {
  if (!handler) return undefined
  return (event: E) => {
    if (isEditableFieldTarget(event.target)) return
    handler(event)
  }
}

/**
 * 整体转发传感器声明的拖动监听, 并对输入控件放行。
 *
 * <p><b>为什么不能逐个硬编码键名</b>: 不同 Sensor 声明的事件名不同 ——
 * `MouseSensor` → `onMouseDown`、`PointerSensor` → `onPointerDown`、
 * `TouchSensor` → `onTouchStart`、`KeyboardSensor` → `onKeyDown`。
 * 一旦更换传感器而忘记同步键名, 拖动会**静默失效**(不报错、UI 也没变化),
 * 只有人工点一下才发现。2026-10 就踩过一次: 把 PointerSensor 换成 MouseSensor 后
 * 仍取 `listeners.onPointerDown`, 鼠标拖动直接没接线。</p>
 *
 * <p>因此这里按传感器实际给出的键整体转发, 换传感器无需改调用方。</p>
 */
export function forwardDragListeners(
  listeners: Record<string, unknown> | undefined,
): ForwardedListeners {
  const forwarded: ForwardedListeners = {}
  if (!listeners) return forwarded
  for (const [key, value] of Object.entries(listeners)) {
    if (typeof value !== 'function') continue
    // 键盘与指针一律走同一放行判定: 焦点在输入控件内时不得被拖动劫持
    forwarded[key] = guard(
      value as (event: { target: EventTarget | null }) => void,
    ) as never
  }
  return forwarded
}
