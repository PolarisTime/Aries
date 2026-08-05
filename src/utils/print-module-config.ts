/**
 * 打印作业按业务模块拆分配置：不同模块显示不同的打印选项和明细字段。
 * 销售订单（sales-order）支持单价/金额列与隐藏单价/品牌替换等选项；
 * 其他模块（物流对账单、客户对账单、物流单等）隐藏销售订单专属选项，
 * 明细列不含单价/金额（金额/运费在分组行或表尾汇总展示）。
 */

/** 打印明细中可展示的取值字段（对应 PrintRecordItem 上的字符串属性）。 */
export type PrintItemFieldKey =
  | 'category'
  | 'material'
  | 'spec'
  | 'length'
  | 'quantity'
  | 'pieceWeightTon'
  | 'weightTon'
  | 'unitPrice'
  | 'amount'

export interface PrintItemFieldSpec {
  key: PrintItemFieldKey
  labelKey: string
}

const SALES_ORDER_MODULE = 'sales-order'

const FULL_PRINT_ITEM_FIELDS: PrintItemFieldSpec[] = [
  { key: 'category', labelKey: 'modules.print.itemCategory' },
  { key: 'material', labelKey: 'modules.print.itemMaterial' },
  { key: 'spec', labelKey: 'modules.print.itemSpec' },
  { key: 'length', labelKey: 'modules.print.itemLength' },
  { key: 'quantity', labelKey: 'modules.print.itemQuantity' },
  { key: 'pieceWeightTon', labelKey: 'modules.print.itemPieceWeight' },
  { key: 'weightTon', labelKey: 'modules.print.itemWeight' },
  { key: 'unitPrice', labelKey: 'modules.print.itemUnitPrice' },
  { key: 'amount', labelKey: 'modules.print.itemAmount' },
]

const NON_SALES_PRINT_ITEM_FIELDS = FULL_PRINT_ITEM_FIELDS.filter(
  (field) => field.key !== 'unitPrice' && field.key !== 'amount',
)

/** 每列对应宽度，字段数量随模块变化。 */
const PRINT_ITEM_COLUMN_WIDTHS: Record<string, string> = {
  category: 'minmax(92px, 1fr)',
  material: 'minmax(110px, 1fr)',
  spec: 'minmax(90px, 0.8fr)',
  length: 'minmax(110px, 1fr)',
  quantity: 'minmax(70px, 0.7fr)',
  pieceWeightTon: 'minmax(80px, 0.8fr)',
  weightTon: 'minmax(90px, 0.8fr)',
  unitPrice: 'minmax(90px, 0.8fr)',
  amount: 'minmax(110px, 1fr)',
}

export function getPrintItemFields(moduleKey: string): PrintItemFieldSpec[] {
  return moduleKey === SALES_ORDER_MODULE
    ? FULL_PRINT_ITEM_FIELDS
    : NON_SALES_PRINT_ITEM_FIELDS
}

export function getPrintItemColumnWidths(
  fields: PrintItemFieldSpec[],
): string[] {
  return fields.map((field) => PRINT_ITEM_COLUMN_WIDTHS[field.key])
}

/** 销售订单专属的打印选项（其他模块隐藏）。 */
export function supportsSalesOrderPrintOption(moduleKey: string): boolean {
  return moduleKey === SALES_ORDER_MODULE
}
