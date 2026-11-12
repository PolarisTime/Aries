import { Table } from 'antd'
import type { ReactNode } from 'react'

/** 合计文字的一段：`label` 可省略（如「合计（4 行）」这种本身就是完整短语的段）。 */
export interface SummaryTextPart {
  label?: string
  value: ReactNode
}

interface Props {
  /** 跨列表格单元格的列数：整行铺满，文字右端才会贴住表格右边界。 */
  colSpan: number
  parts: SummaryTextPart[]
  /** 追加在行上的类名（页面既有的行样式，如 `module-detail-summary-row`）。 */
  rowClassName?: string
  /** 追加在文字块上的类名（页面既有的文字样式）。 */
  textClassName?: string
}

/**
 * 明细表底部的「合计」行：**一行文字、右端对齐**（相对的是逐列铺开的合计行）。
 *
 * <p>全站只有这一处实现：编辑器草稿合计（`ModuleEditorItemsSummary`）与只读详情面合计
 * （`ModuleDetailSummaryRow`）都渲染它，因此跨列单元格、分隔符、右对齐、空表策略不会
 * 各写一份后漂移。文案由调用方给 —— 编辑态是 i18n 模板句，只读态是「列名 值」，
 * 两者句式不同属于**状态差异**，不在公共层强行统一。</p>
 *
 * <p>为什么不用 antd 文档里的逐列合计：明细表列多（12+）+ 横向滚动 + 编辑态实时刷新，
 * 逐列合计会把三个数拉到几乎不可读，还会看起来像多了一行数据；收成一句贴右后，
 * 扫读路径变成「右下一眼看到」。</p>
 *
 * <p>空表不渲染：没有可用段落时返回 `null`，把空态交回 antd 的 `Empty`，
 * 避免出现「合计 0 行」这种没有信息量的行。</p>
 */
export function SummaryTextRow({
  colSpan,
  parts,
  rowClassName,
  textClassName,
}: Props) {
  const text = joinSummaryParts(parts)
  if (!text) return null

  return (
    <Table.Summary>
      <Table.Summary.Row
        className={['module-summary-text-row', rowClassName]
          .filter(Boolean)
          .join(' ')}
      >
        <Table.Summary.Cell index={0} colSpan={Math.max(colSpan, 1)}>
          <div
            className={['module-summary-text', textClassName]
              .filter(Boolean)
              .join(' ')}
          >
            {text}
          </div>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  )
}

/**
 * 把合计段落拼成一句话：`label value`，段与段之间用 ` · ` 连接。
 *
 * <p>值为空（`null` / `undefined` / 空串）的段整段丢弃 —— 合计行里出现
 * 「金额 」这种只有标签没有数字的残段，比不显示更容易被当成零。
 * 全部为空时返回空串，由 {@link SummaryTextRow} 判定不渲染整行。</p>
 */
export function joinSummaryParts(parts: SummaryTextPart[]): string {
  return parts
    .map(({ label, value }) => {
      const text = value === null || value === undefined ? '' : String(value)
      if (!text.trim()) return ''
      const prefix = label?.trim()
      return prefix ? `${prefix} ${text}` : text
    })
    .filter(Boolean)
    .join(' · ')
}
