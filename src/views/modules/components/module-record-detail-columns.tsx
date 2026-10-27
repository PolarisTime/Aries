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
    align: column.align || 'center',
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
