import type { TableColumnsType } from 'antd'
import {
  formatDocumentReferenceText,
  isDocumentReferenceField,
} from '@/components/document-reference/document-reference-utils'
import { shouldDisplayPieceWeightAsDash } from '@/module-system/presentation/module-line-item-display'
import type { ModuleLineItem } from '@/types/module-page'
import type { ModuleColumnDefinition } from '@/types/module-page-fields'

/**
 * 详情弹窗只读明细列的构建。
 *
 * <p>抽出原因：原来这些逻辑内联在 ModuleRecordDetailOverlay 的 JSX 里，
 * 「组件 → JSX → map 回调 → if → 属性对象 → 嵌套三元」把嵌套深度顶到 5
 * (react-doctor/no-high-complexity-react-function)，控制流复杂度也一起越界。
 * 拆成独立的纯函数后，嵌套深度回到 2~3，并且列渲染规则可以脱离 React 断言。</p>
 */

export interface BuildDetailItemColumnsInput {
  columns: ModuleColumnDefinition[]
  formatCellValue: (value: unknown, columnType?: string) => string
}

/**
 * 需要右对齐的数值列类型。
 *
 * <p>编辑器里这些列是居中（可编辑时居中便于定位输入框），但**只读详情表**里
 * 居中会让「18 / 40.560 / 0.00」这类数字对不齐小数点和量级，一张 11 列的表
 * 从上往下扫读合计时很费劲；只读表数值列右对齐是通用做法，且不影响编辑器。</p>
 *
 * <p>详情表的单元格对齐由 `.module-detail-table` 的 CSS 统一 `!important` 居中，
 * antd 的 `align` prop 会被它压掉，因此这里用列 className 做标记，由 CSS 覆盖
 * （`module-detail-table-cell--numeric`），而不是假装 `align: 'right'` 就能生效。</p>
 */
const NUMERIC_COLUMN_TYPES: ReadonlySet<string> = new Set([
  'amount',
  'weight',
  'count',
])

/** 详情只读明细列: 单重与大重量显示规则与编辑器表格保持一致。 */
export function buildDetailItemColumns({
  columns,
  formatCellValue,
}: BuildDetailItemColumnsInput): TableColumnsType<ModuleLineItem> {
  return columns.map((column) => ({
    title: column.title,
    dataIndex: column.dataIndex,
    key: column.dataIndex,
    width: column.width,
    className:
      column.type && NUMERIC_COLUMN_TYPES.has(column.type)
        ? 'module-detail-table-cell--numeric'
        : undefined,
    align: column.align || 'center',
    /* 与编辑器明细表同一口径：短枚举/数值列不省略，长文本列省略并保留 title 全文。 */
    ellipsis: column.ellipsis ?? true,
    render: (value: unknown, record: ModuleLineItem) => {
      if (
        column.dataIndex === 'pieceWeightTon' &&
        shouldDisplayPieceWeightAsDash(record)
      ) {
        return '-'
      }
      if (isDocumentReferenceField(column.dataIndex)) {
        // 单据引用列只展示单号纯文本（文本口径见 formatDocumentReferenceText）
        return formatDocumentReferenceText(value) || '-'
      }
      if (column.render) {
        return column.render(value, record)
      }
      return formatCellValue(value, column.type)
    },
  }))
}
