import type { ModuleColumnType } from '@/types/module-page-fields'
import type {
  TradeLineItemEditorSemantics,
  TradeLineItemFieldKey,
} from '@/types/trade-line-item-fields'

export type {
  TradeLineItemEditorControl,
  TradeLineItemEditorSemantics,
  TradeLineItemFieldKey,
} from '@/types/trade-line-item-fields'

/**
 * 交易明细公共字段目录：字段 key、多语言 label key 与基础展示属性的唯一来源。
 *
 * 边界约定：
 * - 目录只维护前端展示语义（label key、宽度、对齐、类型、编辑器控件），
 *   不维护模块流程锁定、后端必填、打印布局和数据库映射。
 * - 模块通过 {@link ModuleItemColumnConfig} 显式声明 include 白名单与覆盖，
 *   公共目录新增字段不会自动进入未声明模块。
 * - 解析器只输出展示列（ModuleColumnDefinition[]），
 *   不能替代 `saveFields.lineItem`、`LINE_ITEM_FIELDS` 或 strict Zod 保存 schema。
 */
export interface TradeLineItemFieldSpec {
  key: TradeLineItemFieldKey
  /** i18n label key；目录不持有跨语言翻译文本 */
  labelKey: string
  width: number
  align?: 'left' | 'center' | 'right'
  type?: ModuleColumnType
  /** 编辑器控件与基础编辑语义，由解析器透传给明细编辑器 */
  editor?: TradeLineItemEditorSemantics
}

export const TRADE_LINE_ITEM_FIELD_KEYS: readonly TradeLineItemFieldKey[] = [
  'sourceNo',
  'materialCode',
  'brand',
  'category',
  'material',
  'spec',
  'length',
  'unit',
  'piecesPerBundle',
  'warehouseName',
  'batchNo',
  'quantity',
  'quantityUnit',
  'pieceWeightTon',
  'weightTon',
  'settlementMode',
  'weighWeightTon',
  'weightAdjustmentTon',
  'weightAdjustmentAmount',
  'actualWeightTon',
  'unitPrice',
  'amount',
  'materialName',
  'customerName',
  'projectName',
]

export const TRADE_LINE_ITEM_FIELD_CATALOG: Readonly<
  Record<TradeLineItemFieldKey, TradeLineItemFieldSpec>
> = {
  sourceNo: {
    key: 'sourceNo',
    labelKey: 'modules.columns.outboundNo',
    width: 140,
    editor: { control: 'text' },
  },
  materialCode: {
    key: 'materialCode',
    labelKey: 'modules.columns.materialCode',
    width: 280,
    align: 'center',
    editor: { control: 'material' },
  },
  brand: {
    key: 'brand',
    labelKey: 'modules.columns.brand',
    width: 68,
    align: 'center',
    editor: { control: 'text' },
  },
  category: {
    key: 'category',
    labelKey: 'modules.columns.category',
    width: 58,
    align: 'center',
    editor: { control: 'text' },
  },
  material: {
    key: 'material',
    labelKey: 'modules.columns.material',
    width: 76,
    align: 'center',
    editor: { control: 'text' },
  },
  spec: {
    key: 'spec',
    labelKey: 'modules.columns.spec',
    width: 72,
    align: 'center',
    editor: { control: 'text' },
  },
  length: {
    key: 'length',
    labelKey: 'modules.columns.length',
    width: 64,
    align: 'center',
    editor: { control: 'text' },
  },
  unit: {
    key: 'unit',
    labelKey: 'modules.columns.unit',
    width: 56,
    align: 'center',
    editor: { control: 'text' },
  },
  piecesPerBundle: {
    key: 'piecesPerBundle',
    labelKey: 'modules.columns.piecesPerBundle',
    width: 76,
    align: 'center',
    type: 'count',
    editor: { control: 'number', min: 0, controls: true },
  },
  warehouseName: {
    key: 'warehouseName',
    labelKey: 'modules.columns.warehouseName',
    width: 160,
    editor: { control: 'warehouse' },
  },
  batchNo: {
    key: 'batchNo',
    labelKey: 'modules.columns.batchNo',
    width: 130,
    editor: { control: 'text' },
  },
  quantity: {
    key: 'quantity',
    labelKey: 'modules.columns.quantity',
    width: 70,
    align: 'center',
    type: 'count',
    editor: { control: 'number', min: 0, controls: false },
  },
  quantityUnit: {
    key: 'quantityUnit',
    labelKey: 'modules.columns.quantityUnit',
    width: 64,
    align: 'center',
    editor: { control: 'text' },
  },
  pieceWeightTon: {
    key: 'pieceWeightTon',
    labelKey: 'modules.columns.pieceWeightTon',
    width: 76,
    align: 'center',
    type: 'weight',
    editor: { control: 'number', precision: 8, min: 0, controls: false },
  },
  weightTon: {
    key: 'weightTon',
    labelKey: 'modules.columns.weightTon',
    width: 108,
    align: 'center',
    type: 'weight',
    editor: { control: 'number', precision: 8, min: 0, controls: false },
  },
  settlementMode: {
    key: 'settlementMode',
    labelKey: 'modules.columns.settlementMode',
    width: 76,
    align: 'center',
    editor: { control: 'settlementMode' },
  },
  weighWeightTon: {
    key: 'weighWeightTon',
    labelKey: 'modules.columns.weighWeight',
    width: 86,
    align: 'center',
    type: 'weight',
    editor: {
      control: 'number',
      precision: 3,
      min: 0,
      controls: false,
    },
  },
  weightAdjustmentTon: {
    key: 'weightAdjustmentTon',
    labelKey: 'modules.columns.weightAdjustmentTon',
    width: 106,
    align: 'center',
    type: 'weight',
    editor: { control: 'number', precision: 8, controls: true },
  },
  weightAdjustmentAmount: {
    key: 'weightAdjustmentAmount',
    labelKey: 'modules.columns.weightAdjustmentAmount',
    width: 90,
    align: 'center',
    type: 'amount',
    editor: { control: 'number', precision: 2, controls: true },
  },
  actualWeightTon: {
    key: 'actualWeightTon',
    labelKey: 'modules.columns.weighWeight',
    width: 96,
    align: 'center',
    type: 'weight',
    editor: {
      control: 'number',
      precision: 3,
      min: 0,
      controls: false,
    },
  },
  unitPrice: {
    key: 'unitPrice',
    labelKey: 'modules.columns.unitPrice',
    width: 86,
    align: 'center',
    type: 'amount',
    editor: { control: 'number', precision: 2, min: 0, controls: false },
  },
  amount: {
    key: 'amount',
    labelKey: 'modules.columns.amount',
    width: 90,
    align: 'center',
    type: 'amount',
    editor: { control: 'number', precision: 2, min: 0, controls: true },
  },
  materialName: {
    key: 'materialName',
    labelKey: 'modules.columns.materialName',
    width: 156,
    editor: { control: 'text' },
  },
  customerName: {
    key: 'customerName',
    labelKey: 'modules.columns.customerName',
    width: 136,
    editor: { control: 'text' },
  },
  projectName: {
    key: 'projectName',
    labelKey: 'modules.columns.projectName',
    width: 156,
    editor: { control: 'text' },
  },
}
