/**
 * 打印明细字段的展示细节（文案、宽度、对齐）。
 *
 * <p>模块差异（显示哪些列、哪些默认隐藏、汇总条与选项）的**唯一来源**是
 * {@link getPrintJobLayout}（`utils/print-job-layout`）；本文件只负责把字段 key
 * 映射成文案与列宽，并提供兼容导出。新增/调整模块行为请改布局配置，不要在这里加
 * `moduleKey === 'xxx'` 分支。</p>
 */

import type { ModuleKey } from '@/module-system/core/module-key'
import { isModuleKey } from '@/module-system/core/module-key'
import { getPrintJobLayout } from '@/utils/print-job-layout'

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
  ...FULL_PRINT_ITEM_FIELDS,
  { key: 'quantityUnit', labelKey: 'modules.columns.quantityUnit' },
]

const FREIGHT_STATEMENT_PRINT_ITEM_FIELDS: PrintItemFieldSpec[] = [
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

/** 字段 key → 文案（Map 查找，避免明细列逐行线性查数组）。 */
const FIELD_SPECS = new Map<PrintItemFieldKey, PrintItemFieldSpec>(
  [
    ...FULL_PRINT_ITEM_FIELDS,
    ...CUSTOMER_STATEMENT_PRINT_ITEM_FIELDS,
    ...FREIGHT_STATEMENT_PRINT_ITEM_FIELDS,
    { key: 'sourceNo' as const, labelKey: 'modules.print.itemSourceNo' },
  ].map((field) => [field.key, field] as const),
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

/** 按模块布局返回明细列（已排除「能力支持但默认隐藏」的列）。 */
export function getPrintItemFields(moduleKey: string): PrintItemFieldSpec[] {
  const layout = getPrintJobLayout(moduleKey)
  const hidden = new Set(layout.hiddenItemFields)
  const fields: PrintItemFieldSpec[] = []
  for (const key of layout.itemFields) {
    if (hidden.has(key)) continue
    const spec = FIELD_SPECS.get(key)
    if (spec) {
      fields.push(spec)
    }
  }
  return fields
}

export function getPrintItemColumnWidth(field: PrintItemFieldSpec): number {
  return PRINT_ITEM_COLUMN_WIDTHS[field.key]
}

const PRINT_ITEM_ALIGN_OVERRIDES_BY_MODULE = {
  'customer-statement': CUSTOMER_STATEMENT_FIELD_ALIGNS,
  'freight-statement': FREIGHT_STATEMENT_FIELD_ALIGNS,
} satisfies Partial<
  Record<ModuleKey, Partial<Record<PrintItemFieldKey, PrintItemFieldAlign>>>
>

export function getPrintItemColumnAlign(
  field: PrintItemFieldSpec,
  moduleKey?: string,
): PrintItemFieldAlign {
  const overrides =
    moduleKey && isModuleKey(moduleKey)
      ? (
          PRINT_ITEM_ALIGN_OVERRIDES_BY_MODULE as Partial<
            Record<
              ModuleKey,
              Partial<Record<PrintItemFieldKey, PrintItemFieldAlign>>
            >
          >
        )[moduleKey]
      : undefined
  return overrides?.[field.key] || PRINT_ITEM_FIELD_ALIGNS[field.key]
}

/** 销售订单专属打印选项（隐藏单价 / 品牌替换 / 合并拆分），由布局配置派生。 */
export function supportsSalesOrderPrintOption(moduleKey: string): boolean {
  const { options } = getPrintJobLayout(moduleKey)
  return options.merge || options.split || options.brandOverride
}

/** 对账单类打印模块（按来源单/项目分组渲染），由布局配置派生。 */
export function isStatementPrintModule(moduleKey: string): boolean {
  return getPrintJobLayout(moduleKey).statementGrouped
}
