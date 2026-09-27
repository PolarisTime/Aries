import type { MenuProps } from 'antd'
import { createContext, type MouseEvent as ReactMouseEvent } from 'react'
import type { ActionItem } from './TableActions'

/**
 * 表格行右键菜单的共享定义。
 *
 * <p>行操作在业务列表里统一由 `ActionItem[]` 产出(见 hooks/useModuleRecordActions.ts),
 * 因此行右键菜单可以直接复用同一份动作, 不需要为每个模块重写;</p>
 */

/** 单行的右键菜单配置(可访问名、菜单项与回调均已绑定到该行)。 */
export interface RowContextMenuConfig {
  ariaLabel: string
  items: MenuProps['items']
  onClick: MenuProps['onClick']
  /**
   * 菜单打开回调(行右键与行尾「更多」按钮共用)。
   *
   * <p>打开行菜单即视为"操作目标=该行", 调用方据此把选中态同步到这一行,
   * 避免菜单里的动作作用在之前选中的另一行上(删错行)。</p>
   */
  onOpen?: () => void
}

/** 行菜单查找表: 键为行 key(String(record.id)), 由表格按 data-row-key 取用。 */
export type RowContextMenuMap = Map<string, RowContextMenuConfig>

/**
 * 行右键菜单上下文。
 *
 * <p>行由 antd Table 的 `components.body.row` 渲染, 拿不到行数据与回调,
 * 因此菜单配置由外层以行 key 为键注入, 行容器按 `data-row-key` 取用。</p>
 */
export const RowContextMenuContext = createContext<RowContextMenuMap | null>(
  null,
)

/** 需要保留浏览器原生右键菜单的控件(输入、下拉、数字输入、可编辑区域)。 */
const NATIVE_CONTEXT_MENU_SELECTOR =
  'input,textarea,.ant-select,.ant-input-number,[contenteditable="true"]'

/**
 * 包裹层的右键捕获: 命中输入控件时中止冒泡, 让输入框保留原生右键行为
 * (粘贴、全选等), 自定义菜单只在行/分组容器上生效。
 */
export function preserveNativeContextMenuOnInputs(
  event: ReactMouseEvent<HTMLElement>,
) {
  const target = event.target as HTMLElement | null
  if (target?.closest(NATIVE_CONTEXT_MENU_SELECTOR)) {
    event.stopPropagation()
  }
}

/** 事件是否落在输入控件上(命中时应完全放行, 连菜单也不打开)。 */
export function isNativeContextMenuTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest(NATIVE_CONTEXT_MENU_SELECTOR))
  )
}

export interface BuildRowContextMenusParams<Row> {
  records: Row[]
  /** 与该行可见按钮完全同源的动作列表 */
  buildActions: (row: Row) => ActionItem[]
  /** 行标识(用于拼可访问名, 便于读屏区分操作对象) */
  labelOf: (row: Row) => string
  /** 可访问名模板: 传入行标识返回菜单 aria-label */
  ariaLabelOf: (label: string) => string
  okText: string
  cancelText: string
  /** 菜单打开时回调(用于把选中态同步到该行); 未传时 config 上不带 onOpen */
  onMenuOpen?: (row: Row) => void
  /** 需要二次确认的动作(如删除)统一走这里, 由调用方注入 modal.confirm */
  requestConfirm: (options: {
    title: string
    okText: string
    cancelText: string
    danger?: boolean
    onOk: () => void
  }) => void
}

/**
 * 由行数据与 `ActionItem[]` 生成行右键菜单查找表。
 *
 * <p>菜单项与可见按钮共用同一份 label / disabled / danger, 因此不会出现
 * 「按钮能点、菜单里点不动」这类漂移; 带 confirm 的动作在菜单路径改走
 * modal.confirm(不用 Popconfirm: 包在自定义组件外层时 rc-trigger 量不到触发元素,
 * 弹层会落在屏幕外)。</p>
 */
export function buildRowContextMenus<Row extends { id: unknown }>({
  records,
  buildActions,
  labelOf,
  ariaLabelOf,
  okText,
  cancelText,
  onMenuOpen,
  requestConfirm,
}: BuildRowContextMenusParams<Row>): RowContextMenuMap {
  const menus: RowContextMenuMap = new Map()
  for (const record of records) {
    const actions = buildActions(record).filter(
      (action) => action.visible !== false,
    )
    if (!actions.length) continue
    menus.set(String(record.id), {
      ariaLabel: ariaLabelOf(labelOf(record)),
      items: actions.map((action) => ({
        key: action.key,
        label: action.label,
        icon: action.icon,
        danger: action.danger,
        disabled: action.disabled,
      })),
      // 没传 onMenuOpen 就不带 onOpen, 保持既有配置形状不变
      ...(onMenuOpen ? { onOpen: () => onMenuOpen(record) } : {}),
      onClick: ({ key }) => {
        const action = actions.find((item) => item.key === String(key))
        if (!action || action.disabled) return
        if (action.confirm) {
          requestConfirm({
            title: action.confirm,
            okText,
            cancelText,
            danger: action.danger,
            onOk: () => action.onClick(),
          })
          return
        }
        action.onClick()
      },
    })
  }
  return menus
}
