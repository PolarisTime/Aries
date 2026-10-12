import type { TableColumnsType } from 'antd'
import { DocumentReferencePopover } from '@/components/DocumentReferencePopover'
import { isDocumentReferenceField } from '@/components/document-reference/document-reference-utils'
import { shouldDisplayPieceWeightAsDash } from '@/module-system/presentation/module-line-item-display'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import type { ModuleColumnDefinition } from '@/types/module-page-fields'

/**
 * 详情弹窗只读明细列的构建 + 单据引用弹层摘要的提取。
 *
 * <p>抽出原因：原来这些逻辑内联在 ModuleRecordDetailOverlay 的 JSX 里，
 * 「组件 → JSX → map 回调 → if → 属性对象 → 嵌套三元」把嵌套深度顶到 5
 * (react-doctor/no-high-complexity-react-function)，控制流复杂度也一起越界。
 * 拆成独立的纯函数后，嵌套深度回到 2~3，并且列渲染规则可以脱离 React 断言。</p>
 */

/** 对比方名称: 客户/供应商/承运商依次回退，都没有则不下发。 */
function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string') return value
  }
  return undefined
}

function textOrNumber(value: unknown): string | number | undefined {
  return typeof value === 'number' || typeof value === 'string'
    ? value
    : undefined
}

/** 明细列里单据引用弹层的摘要: 仅认 record 上的单据主字段。 */
export function buildDetailItemColumnSummary(record: ModuleRecord) {
  return {
    counterpartyName: firstText(
      record.customerName,
      record.supplierName,
      record.carrierName,
    ),
    amount: textOrNumber(record.amount),
    status: typeof record.status === 'string' ? record.status : undefined,
  }
}

/** 详情字段里单据引用弹层的摘要: 比明细列多一层 counterpartyName 与 totalAmount 回退。 */
export function buildDetailFieldSummary(record: ModuleRecord) {
  return {
    counterpartyName: firstText(
      record.counterpartyName,
      record.customerName,
      record.supplierName,
      record.carrierName,
    ),
    amount: textOrNumber(record.amount) ?? textOrNumber(record.totalAmount),
    status: typeof record.status === 'string' ? record.status : undefined,
  }
}

export interface BuildDetailItemColumnsInput {
  columns: ModuleColumnDefinition[]
  moduleKey: string
  formatCellValue: (value: unknown, columnType?: string) => string
}

/** 详情只读明细列: 单重与大重量显示规则与编辑器表格保持一致。 */
export function buildDetailItemColumns({
  columns,
  moduleKey,
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
        return (
          <DocumentReferencePopover
            value={value}
            fieldKey={column.dataIndex}
            contextModuleKey={moduleKey}
            documentLabel={column.title}
            summary={buildDetailItemColumnSummary(record)}
          />
        )
      }
      if (column.render) {
        return column.render(value, record)
      }
      return formatCellValue(value, column.type)
    },
  }))
}
