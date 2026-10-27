import type { ReactNode } from 'react'

interface RowIdentityCellProps {
  /** 行序号（跨分页连续：`(当前页 - 1) × 每页条数 + 行下标 + 1`） */
  sequenceNumber: number
  /**
   * antd 生成的**行复选框**。
   *
   * <p>必须由 antd 提供（`rowSelection.renderCell` 的 `originNode`）：全选/半选、
   * Shift 连选、以及「选择此行：<单号>」的可访问名都是 antd 的实现，自己画复选框就得把
   * 这套语义整抄一遍。</p>
   */
  checkbox: ReactNode
  /** 明细按钮（口径在 `useGridColumns`）；不传时该位置留空 */
  detailToggle: ReactNode
  /** 该行是否已勾选：勾选后序号让位给勾选框；未勾选时只在行悬停/键盘聚焦时让位 */
  selected: boolean
}

/**
 * 首位「身份列」的行内单元格 —— 两组控件。
 *
 * <p>① **序号⇄勾选**：同一个 26px 槽位。常态显示序号徽标；行悬停、键盘聚焦到复选框、
 * 或该行已勾选时，原位换成勾选框（Airtable / Notion 的行选择器形态）。既省掉一个独立
 * 复选框列位，又保留了"一眼看到行号"，交互上与"点行即勾选"一致。</p>
 *
 * <p>② **行内动作**：只剩明细加号。行菜单的可见「⋮」按钮已按使用者要求移除 ——
 * 行级命令（复制单号 / 重新核定 / 附件）在工具栏与勾选横幅里都有同一份入口，行菜单本身
 * 仍可通过**右键**、**触摸长按 600ms**、**键盘 Shift+F10 / 上下文菜单键**打开
 * （三条路径都由 `RowContextMenuRow` 提供，见《上下文菜单与键盘操作契约》的例外条款）。</p>
 *
 * <p>布局与命中区尺寸见 `layout-shell.css` 的 `.module-row-identity`（槽位 26px、
 * 按钮 24×24，WCAG 2.2 SC 2.5.8）。</p>
 */
export function RowIdentityCell({
  sequenceNumber,
  checkbox,
  detailToggle,
  selected,
}: RowIdentityCellProps) {
  return (
    <div
      className={
        selected
          ? 'module-row-identity module-row-identity--selected'
          : 'module-row-identity'
      }
    >
      <span className="module-row-identity-selector">
        <span className="module-row-identity-seq">{sequenceNumber}</span>
        {checkbox}
      </span>
      <span className="module-row-identity-actions">{detailToggle}</span>
    </div>
  )
}

interface RowIdentityHeaderProps {
  /** 列名（「序号」） */
  label: string
  /** antd 生成的**表头全选复选框**（`rowSelection.columnTitle` 的函数入参） */
  selectAll: ReactNode
}

/**
 * 身份列的表头：全选复选框 + 列名。
 *
 * <p>全选复选框必须放在**第一个槽位**（与行内的「序号⇄勾选」同位），才能正对着每一行的
 * 勾选框；列名跟在后面。两者都原样渲染 antd 给的节点 —— 它的可访问名
 * （「全选当前页所有行」）与半选状态都由 `rowSelection.getTitleCheckboxProps` / antd
 * 内部派生，替换成自己的节点就会丢掉全选入口（上一版踩过）。</p>
 */
export function RowIdentityHeader({
  label,
  selectAll,
}: RowIdentityHeaderProps) {
  return (
    <div className="module-row-identity module-row-identity--head">
      <span className="module-row-identity-selector">{selectAll}</span>
      <span className="module-row-identity-head-label">{label}</span>
    </div>
  )
}
