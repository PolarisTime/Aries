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
   * 菜单打开回调(行右键 / 键盘 Shift+F10 / 触摸长按共用)。
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

/**
 * 需要保留浏览器原生右键(粘贴/全选)的控件: 只算**文本/数字**输入与下拉。
 *
 * <p>刻意排除 `checkbox`/`radio`/`button` 一类"点选型" input —— 它们没有可粘贴的
 * 文本内容, 却占着行内很显眼的一格(如行选择框), 把它们算作原生目标会让行菜单
 * 又少一处可点区域。</p>
 */
const EDITABLE_FIELD_SELECTOR = [
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"])',
  'textarea',
  '[contenteditable="true"]',
  '.ant-select',
  '.ant-input-number',
].join(',')

/** 是否为可读写 disabled/readOnly 的文本类表单元素。 */
function isTextField(
  node: Element,
): node is HTMLInputElement | HTMLTextAreaElement {
  return node.tagName === 'INPUT' || node.tagName === 'TEXTAREA'
}

/**
 * 事件是否落在**正在编辑**(非 disabled/readOnly)的文本/数字输入控件或下拉上。
 *
 * <p>与 {@link isNativeContextMenuTarget} 的区别: 后者只看标签名, 会把
 * 「已禁用/只读」的输入控件也算成原生右键目标。在报单比价这类整行铺满输入控件的
 * 表格里, 那会让右键菜单几乎无处可点 —— 禁用的控件本身已不可编辑, 不需要原生菜单,
 * 应改走行菜单(并在菜单里说明禁用原因)。</p>
 */
export function isEditableFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  const control = target.closest(EDITABLE_FIELD_SELECTOR)
  if (!control) return false
  // 用 tagName 判定而非 instanceof: TS 7 未对 Element 做 instanceof 窄化
  if (isTextField(control)) return !control.disabled && !control.readOnly
  if (control.getAttribute('contenteditable') === 'true') return true
  // antd 下拉/数字输入: 以内层真实 input 的可编辑状态为准
  const inner = control.querySelector('input,textarea')
  if (inner) return isTextField(inner) && !inner.disabled && !inner.readOnly
  /*
   * 无内层输入(部分禁用态下拉不渲染 input): 退回容器自身的可用状态 ——
   * antd 把禁用态挂在 `.ant-select-disabled` / `.ant-input-number-disabled` 上,
   * 忽略它会把"已禁用下拉"误判成可编辑, 右键又回到浏览器原生菜单。
   */
  return (
    control.getAttribute('aria-disabled') !== 'true' &&
    !control.classList.contains('ant-select-disabled') &&
    !control.classList.contains('ant-input-number-disabled')
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
