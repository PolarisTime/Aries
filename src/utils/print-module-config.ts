/**
 * 打印作业按业务模块拆分配置：不同模块显示不同的打印选项和明细字段。
 * 销售订单（sales-order）支持单价/金额列与隐藏单价/品牌替换等选项；
 * 客户对账单、物流对账单复用业务页面的分组字段顺序，物流对账单金额在分组行展示。
 */

/** 打印明细中可展示的取值字段（对应 PrintRecordItem 上的字符串属性）。 */
export type PrintItemFieldKey =
  | 'sourceNo'
  | 'brand'
  | 'category'
  | 'material'
  | 'spec'
  | 'length'
  | 'quantity'
  | 'quantityUnit'
  | 'pieceWeightTon'
  | 'weightTon'
  | 'unitPrice'
  | 'amount'

export interface PrintItemFieldSpec {
  key: PrintItemFieldKey
  labelKey: string
}

export type PrintItemFieldAlign = 'left' | 'center' | 'right'

const SALES_ORDER_MODULE = 'sales-order'

const FULL_PRINT_ITEM_FIELDS: PrintItemFieldSpec[] = [
  { key: 'brand', labelKey: 'modules.print.itemBrand' },
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

const CUSTOMER_STATEMENT_PRINT_ITEM_FIELDS: PrintItemFieldSpec[] = [
  { key: 'brand', labelKey: 'modules.print.itemBrand' },
  { key: 'category', labelKey: 'modules.print.itemCategory' },
  { key: 'material', labelKey: 'modules.print.itemMaterial' },
  { key: 'spec', labelKey: 'modules.print.itemSpec' },
  { key: 'length', labelKey: 'modules.print.itemLength' },
  { key: 'quantity', labelKey: 'modules.print.itemQuantity' },
  { key: 'quantityUnit', labelKey: 'modules.columns.quantityUnit' },
  { key: 'pieceWeightTon', labelKey: 'modules.print.itemPieceWeight' },
  { key: 'weightTon', labelKey: 'modules.print.itemWeight' },
  { key: 'unitPrice', labelKey: 'modules.print.itemUnitPrice' },
  { key: 'amount', labelKey: 'modules.print.itemAmount' },
]

const FREIGHT_STATEMENT_PRINT_ITEM_FIELDS: PrintItemFieldSpec[] = [
  { key: 'sourceNo', labelKey: 'modules.columns.outboundNo' },
  { key: 'brand', labelKey: 'modules.print.itemBrand' },
  { key: 'spec', labelKey: 'modules.columns.spec' },
  { key: 'material', labelKey: 'modules.columns.material' },
  { key: 'category', labelKey: 'modules.columns.category' },
  { key: 'length', labelKey: 'modules.columns.length' },
  { key: 'quantity', labelKey: 'modules.columns.quantity' },
  { key: 'quantityUnit', labelKey: 'modules.columns.quantityUnit' },
  { key: 'pieceWeightTon', labelKey: 'modules.columns.pieceWeightTon' },
  { key: 'weightTon', labelKey: 'modules.columns.weightTon' },
]

const NON_SALES_PRINT_ITEM_FIELDS = FULL_PRINT_ITEM_FIELDS.filter(
  (field) => field.key !== 'unitPrice' && field.key !== 'amount',
)

/** 明细数据列固定宽度（px）：合计宽度控制在弹窗标准宽度内，避免横向滚动。 */
const PRINT_ITEM_COLUMN_WIDTHS: Record<PrintItemFieldKey, number> = {
  sourceNo: 180,
  brand: 92,
  category: 84,
  material: 96,
  spec: 104,
  length: 104,
  quantity: 72,
  quantityUnit: 72,
  pieceWeightTon: 88,
  weightTon: 92,
  unitPrice: 96,
  amount: 108,
}

/** 品牌等描述性文本左对齐，规格与数值、金额右对齐。 */
const PRINT_ITEM_FIELD_ALIGNS: Record<PrintItemFieldKey, PrintItemFieldAlign> =
  {
    sourceNo: 'left',
    brand: 'left',
    category: 'left',
    material: 'left',
    spec: 'right',
    length: 'right',
    quantity: 'right',
    quantityUnit: 'right',
    pieceWeightTon: 'right',
    weightTon: 'right',
    unitPrice: 'right',
    amount: 'right',
  }

const CUSTOMER_STATEMENT_FIELD_ALIGNS: Partial<
  Record<PrintItemFieldKey, PrintItemFieldAlign>
> = {
  brand: 'center',
  category: 'center',
  material: 'center',
  spec: 'center',
  length: 'center',
  quantity: 'center',
  quantityUnit: 'center',
}

const FREIGHT_STATEMENT_FIELD_ALIGNS: Partial<
  Record<PrintItemFieldKey, PrintItemFieldAlign>
> = {
  brand: 'left',
  spec: 'left',
  material: 'left',
  category: 'left',
  length: 'left',
  quantity: 'center',
  quantityUnit: 'center',
  pieceWeightTon: 'center',
  weightTon: 'center',
}

export function getPrintItemFields(moduleKey: string): PrintItemFieldSpec[] {
  if (moduleKey === 'customer-statement') {
    return CUSTOMER_STATEMENT_PRINT_ITEM_FIELDS
  }
  if (moduleKey === 'freight-statement') {
    return FREIGHT_STATEMENT_PRINT_ITEM_FIELDS
  }
  return moduleKey === SALES_ORDER_MODULE
    ? FULL_PRINT_ITEM_FIELDS
    : NON_SALES_PRINT_ITEM_FIELDS
}

export function getPrintItemColumnWidth(field: PrintItemFieldSpec): number {
  return PRINT_ITEM_COLUMN_WIDTHS[field.key]
}

export function getPrintItemColumnAlign(
  field: PrintItemFieldSpec,
  moduleKey?: string,
): PrintItemFieldAlign {
  if (moduleKey === 'customer-statement') {
    return (
      CUSTOMER_STATEMENT_FIELD_ALIGNS[field.key] ||
      PRINT_ITEM_FIELD_ALIGNS[field.key]
    )
  }
  if (moduleKey === 'freight-statement') {
    return (
      FREIGHT_STATEMENT_FIELD_ALIGNS[field.key] ||
      PRINT_ITEM_FIELD_ALIGNS[field.key]
    )
  }
  return PRINT_ITEM_FIELD_ALIGNS[field.key]
}

/** 销售订单专属的打印选项（其他模块隐藏）。 */
export function supportsSalesOrderPrintOption(moduleKey: string): boolean {
  return moduleKey === SALES_ORDER_MODULE
}
