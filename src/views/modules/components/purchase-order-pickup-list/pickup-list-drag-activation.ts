import { isEditableFieldTarget } from '@/components/row-context-menu'

/** dnd-kit listener 的可空形态。 */
export type Listener<E> = ((event: E) => void) | undefined

/**
 * 只在非输入控件上启动拖动。
 *
 * <p>取消可见拖动手柄后, 拖动激活点变成整行/整分组头, 其上铺着数量、备注等输入控件。
 * 若不加拦截, 在输入框内长按或按住拖动会被 dnd-kit 当成"拖动整行", 用户就没法选文本、
 * 也没法按住连续调节数字。</p>
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
