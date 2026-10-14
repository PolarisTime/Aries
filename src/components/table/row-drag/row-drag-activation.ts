import { isEditableFieldTarget } from '@/components/row-context-menu'

/** 单个 dnd-kit 监听器的可空形态。 */
export type Listener<E> = ((event: E) => void) | undefined

/** 转发后的监听器集合: 键名与传感器声明的一致。 */
export type ForwardedListeners = Record<string, (event: never) => void>

/**
 * 交互型目标: 这些控件上的长按各自有意义, 不能被整行拖动抢走。
 *
 * <p>可编辑输入/下拉/数字输入复用行菜单同一套口径({@link isEditableFieldTarget}),
 * 这里再补齐"点选型"控件: 行选择框、行内按钮(删除/拆分/锁定等)、链接、把整行包成
 * 菜单触发器的容器。缺了它们, 在行内按钮上按住 380ms 就会把整行拖走。</p>
 */
const ROW_DRAG_INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="menuitem"]',
  '.ant-checkbox-wrapper',
  '.ant-btn',
  '.ant-picker',
  '.ant-switch',
].join(',')

/** 控件自身是否已禁用: 禁用控件不是"可操作目标", 从它上面起拖不该成为死区。 */
function isDisabledControl(node: Element): boolean {
  if (
    node.getAttribute('aria-disabled') === 'true' ||
    node.hasAttribute('disabled')
  ) {
    return true
  }
  return [
    'ant-btn-disabled',
    'ant-select-disabled',
    'ant-input-number-disabled',
    'ant-checkbox-wrapper-disabled',
    'ant-picker-disabled',
    'ant-switch-disabled',
  ].some((name) => node.classList.contains(name))
}

/**
 * 该事件目标是否应放行(不起拖)。
 *
 * <p>整行即拖动区之后, 行内既有可编辑单元格也有选择框/删除按钮。不做这个判定会出现
 * 两类事故: 输入框里长按选文本把整行拖走; 按住行选择框不放被当成拖动,
 * 行选择/行点击/右键菜单全部失灵。</p>
 */
export function isRowDragBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  // 正在编辑的输入/下拉: 一律放行(连已禁用的也算, 见 isEditableFieldTarget 的口径说明)
  if (isEditableFieldTarget(target)) return true
  const interactive = target.closest(ROW_DRAG_INTERACTIVE_SELECTOR)
  if (!interactive) return false
  return !isDisabledControl(interactive)
}

/**
 * 只在非交互控件上启动拖动。
 *
 * <p>取消可见拖动手柄后, 拖动激活点变成整行, 其上铺着数量、备注等输入控件与按钮。
 * 若不加拦截, 在这些控件上长按或按住拖动会被 dnd-kit 当成"拖动整行", 用户就没法选文本、
 * 也没法按住连续调节数字; 键盘同理 —— 在备注框里敲空格不应该开始拖动。</p>
 */
export function guard<E extends { target: EventTarget | null }>(
  handler: Listener<E>,
): Listener<E> {
  if (!handler) return undefined
  return (event: E) => {
    if (isRowDragBlockedTarget(event.target)) return
    handler(event)
  }
}

/**
 * 整体转发传感器声明的拖动监听, 并对交互控件放行。
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
