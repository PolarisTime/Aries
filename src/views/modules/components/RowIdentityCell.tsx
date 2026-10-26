import type { ReactNode } from 'react'
import type { RowContextMenuConfig } from '@/components/row-context-menu'
import { RowMenuButton } from './RowMenuButton'

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
  /** 该行的行菜单配置；缺省表示没有行级动作 */
  menu: RowContextMenuConfig | undefined
}

/**
 * 首位「身份列」的行内单元格：序号 · 勾选 · 明细加号 · 行菜单 同格。
 *
 * <p>为什么合并：这些控件各自原本占一整列（64 + 32 + 48 + 40 = 184px），每列只装一个
 * 16~24px 的图标，横向一片竖线读起来"散"，行尾那列还孤零零挂在最右边；合并后 128px，
 * 省下的横向预算全部让给业务列。布局与命中区尺寸见 `layout-shell.css` 的
 * `.module-row-identity`（四件套各 24×24，WCAG 2.2 SC 2.5.8）。</p>
 */
export function RowIdentityCell({
  sequenceNumber,
  checkbox,
  detailToggle,
  menu,
}: RowIdentityCellProps) {
  return (
    <div className="module-row-identity">
      <span className="module-row-identity-seq">{sequenceNumber}</span>
      {checkbox}
      {detailToggle}
      <RowMenuButton menu={menu} />
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
 * 身份列的表头：列名 + 全选复选框。
 *
 * <p>表头与行内必须用**同一套栅格**（`.module-row-identity` 的 4 列固定宽度），
 * 否则两者各自居中时基准不同，列被撑宽后全选复选框会比行复选框偏右。</p>
 *
 * <p>全选复选框必须原样渲染 antd 给的节点：它的可访问名（「全选当前页所有行」）与
 * 半选状态都由 `rowSelection.getTitleCheckboxProps` / antd 内部派生。此前这里直接传
 * 一段文案替换掉整个节点，表头因此**没有任何全选入口**。</p>
 */
export function RowIdentityHeader({
  label,
  selectAll,
}: RowIdentityHeaderProps) {
  return (
    <div className="module-row-identity module-row-identity--head">
      <span className="module-row-identity-seq">{label}</span>
      {selectAll}
    </div>
  )
}
