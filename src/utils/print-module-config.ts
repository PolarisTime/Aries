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
import type { ModuleColumnType } from '@/types/module-page-fields'
import { getPrintJobLayout } from '@/utils/print-job-layout'
import { shouldEllipsizeColumn } from '@/utils/table-column-ellipsis'

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

/**
 * 明细数据列固定宽度（px）：打印弹窗宽度是 `min(1440px, 100vw - 32px)`。
 * 最宽的销售订单 / 客户对账单明细（11 个数据列 1016px + 选择/顺序/序号 192px）
 * 合计 1208px，再加品牌覆盖列（132px）仍小于 1440px，正常桌面不出现横向滚动。
 *
 * <p>宽度下限 = 12px 字体下典型内容宽 + 单元格左右 padding 24px。例如品牌
 * 「盘螺调直」49、材质「HRB400E」52、表头「数量单位」49、金额「12345678.90」70。
 * 低于该下限时短值列就不再能"一眼比对" —— 要么被截断、要么换行把行撑高。</p>
 */
const PRINT_ITEM_COLUMN_WIDTHS: Record<PrintItemFieldKey, number> = {
  sourceNo: 180,
  brand: 92,
  category: 84,
  material: 96,
  spec: 104,
  length: 104,
  quantity: 72,
  // 表头「数量单位」49 + padding 24 = 73；取 80 留余量（原 72 会把表头挤到换行）
  quantityUnit: 80,
  pieceWeightTon: 88,
  weightTon: 92,
  unitPrice: 96,
  amount: 108,
}

/**
 * 显示合并序号 Tag 时的品牌列宽：品牌文本 49 + Tag 约 20 + 间距 4 + padding 24 = 97，
 * 取 136 与相邻列保持同样的留白节奏。放在宽度表里，组件中不再出现第二个宽度数字。
 */
const MERGED_BRAND_COLUMN_WIDTH = 136

/**
 * 明细列的「值语义」：只声明字段本身是什么（数值 / 短文本 / 长文本），不写省略结论。
 *
 * <p>放不下时是否省略由唯一判定 {@link shouldEllipsizeColumn} 给出，与列表主表
 * （`use-business-grid-table`）、父单据选择、明细表同一口径：数值列与短值文本列
 * **不省略** —— 品牌「盘螺调直」截成「盘螺…」、金额 `12345678.90` 截成 `123456…`
 * 既读不出含义也比不了大小；放不下就让表格横向滚动。单号是长文本，仍然省略，
 * 全文由 antd 写进单元格 `title`，悬停与读屏都能拿到。</p>
 *
 * <p>按字段列一张表（而不是在三个字段数组里各写一遍），避免同一字段在销售订单
 * 与对账单两种布局下被声明成不同语义。</p>
 */
const PRINT_ITEM_COLUMN_SEMANTICS: Record<
  PrintItemFieldKey,
  { type?: ModuleColumnType; ellipsis?: boolean }
> = {
  // 单号是长文本（收付款单明细的「来源单号」），放不下仍省略
  sourceNo: { type: 'text' },
  // 短值文本列：显式关掉省略（text 类型默认是省略）
  brand: { type: 'text', ellipsis: false },
  category: { type: 'text', ellipsis: false },
  material: { type: 'text', ellipsis: false },
  spec: { type: 'text', ellipsis: false },
  length: { type: 'text', ellipsis: false },
  quantityUnit: { type: 'text', ellipsis: false },
  // 数值列：count / weight / amount 由判定本身返回「不省略」
  quantity: { type: 'count' },
  pieceWeightTon: { type: 'weight' },
  weightTon: { type: 'weight' },
  unitPrice: { type: 'amount' },
  amount: { type: 'amount' },
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

/**
 * 明细列宽的**唯一出口**。
 *
 * @param options.mergeMarker 该行会显示合并序号 Tag 时给品牌列更宽的预算，
 *   否则 Tag 会把品牌文本挤成省略号。
 */
export function getPrintItemColumnWidth(
  field: PrintItemFieldSpec,
  options?: { mergeMarker?: boolean },
): number {
  if (options?.mergeMarker && field.key === 'brand') {
    return MERGED_BRAND_COLUMN_WIDTH
  }
  return PRINT_ITEM_COLUMN_WIDTHS[field.key]
}

/**
 * 明细列「放不下时是否省略」的**唯一出口**：字段语义 → {@link shouldEllipsizeColumn}。
 *
 * <p>组件不得再硬编码 `ellipsis: true`：短值列（品牌/类别/材质/规格/长度/数量/
 * 数量单位/件重/重量/单价/金额）不省略，只有长文本的单号列省略。</p>
 */
export function getPrintItemColumnEllipsis(field: PrintItemFieldSpec): boolean {
  return shouldEllipsizeColumn(PRINT_ITEM_COLUMN_SEMANTICS[field.key])
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
