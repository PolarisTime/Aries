import type { MenuProps } from 'antd'
import { createContext, type MouseEvent as ReactMouseEvent } from 'react'

/**
 * 提货清单明细行/分组头的右键菜单共享定义。
 *
 * <p>这里只放非组件导出(类型、Context 与事件守卫), 组件文件只导出组件 ——
 * react-doctor 的 `only-export-components` 规则不允许组件文件混出非组件成员。</p>
 */

/** 单行明细的右键菜单配置(可访问名、条目与回调均已按行实例绑定)。 */
export interface PickupRowMenu {
  ariaLabel: string
  items: MenuProps['items']
  onClick: MenuProps['onClick']
}

/** 行菜单查找表: 键为行实例 rowId, 由明细表按当前行集合注入。 */
export type PickupRowMenuMap = Map<string, PickupRowMenu>

/**
 * 明细行右键菜单上下文。
 *
 * <p>表格行由 antd 通过 `components.body.row` 渲染, 拿不到行数据与回调,
 * 因此菜单配置由明细表以 rowId 为键注入, 行容器按 `data-row-key` 取用。</p>
 */
export const PickupRowMenuContext = createContext<PickupRowMenuMap | null>(null)

/**
 * 包裹层的右键捕获: 命中输入控件时中止冒泡, 让输入框保留原生右键行为,
 * 上下文菜单只在行/分组容器上生效(输入控件不被劫持)。
 */
export function preserveNativeContextMenuOnInputs(
  event: ReactMouseEvent<HTMLElement>,
) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input,textarea,.ant-select,.ant-input-number')) {
    event.stopPropagation()
  }
}
