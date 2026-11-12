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
  /**
   * 放不下时是否允许用省略号截断。**默认 true**（长文本列省略并保留 title 全文）。
   *
   * <p>短枚举与数值列必须显式 `false`：品牌/类别/材质/规格/长度/单位/数量/数量单位/
   * 件重/重量/单价/金额这些值本身就是"一眼要比对"的短字符串或数字，截断后
   * 「盘螺调直」变「盘螺…」、「12345678.90」变「123456…」既读不出含义也比不了大小。
   * 不许它们换行或省略，宽度不够就让表格横向滚动（`ModuleItemsTable` 的 `scroll.x`
   * 恒等于列宽合计，天然会出滚动条）。</p>
   */
  ellipsis?: boolean
  /**
   * **打印弹层**里该列的宽度；缺省时沿用 {@link width}。
   *
   * <p>为什么允许两份宽度但不允许两份表：打印单元格是纯文本、无编辑器控件，且要留出
   * 勾选/合并序号的余量，所以个别列（如规格 72→104）需要更宽松；但**声明仍然只有这一处**，
   * `utils/print-module-config` 不再自带宽度表，避免同一字段在两处被改成不同值。</p>
   */
  printWidth?: number
  /** 编辑器控件与基础编辑语义，由解析器透传给明细编辑器 */
  editor?: TradeLineItemEditorSemantics
}

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
    width: 76,
    ellipsis: false,
    printWidth: 92,
    align: 'center',
    editor: { control: 'text' },
  },
  category: {
    key: 'category',
    labelKey: 'modules.columns.category',
    width: 58,
    ellipsis: false,
    printWidth: 84,
    align: 'center',
    editor: { control: 'text' },
  },
  material: {
    key: 'material',
    labelKey: 'modules.columns.material',
    width: 84,
    ellipsis: false,
    printWidth: 96,
    align: 'center',
    editor: { control: 'text' },
  },
  spec: {
    key: 'spec',
    labelKey: 'modules.columns.spec',
    width: 72,
    ellipsis: false,
    printWidth: 104,
    align: 'center',
    editor: { control: 'text' },
  },
  length: {
    key: 'length',
    labelKey: 'modules.columns.length',
    width: 76,
    ellipsis: false,
    printWidth: 104,
    align: 'center',
    editor: { control: 'text' },
  },
  unit: {
    key: 'unit',
    labelKey: 'modules.columns.unit',
    width: 56,
    ellipsis: false,
    align: 'center',
    editor: { control: 'text' },
  },
  piecesPerBundle: {
    key: 'piecesPerBundle',
    labelKey: 'modules.columns.piecesPerBundle',
    width: 76,
    ellipsis: false,
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
    width: 80,
    ellipsis: false,
    printWidth: 72,
    align: 'center',
    type: 'count',
    editor: { control: 'number', min: 0, controls: false },
  },
  quantityUnit: {
    key: 'quantityUnit',
    labelKey: 'modules.columns.quantityUnit',
    width: 76,
    ellipsis: false,
    printWidth: 80,
    align: 'center',
    editor: { control: 'text' },
  },
  pieceWeightTon: {
    key: 'pieceWeightTon',
    labelKey: 'modules.columns.pieceWeightTon',
    width: 76,
    ellipsis: false,
    printWidth: 88,
    align: 'center',
    type: 'weight',
    editor: { control: 'number', precision: 8, min: 0, controls: false },
  },
  weightTon: {
    key: 'weightTon',
    labelKey: 'modules.columns.weightTon',
    width: 108,
    ellipsis: false,
    printWidth: 92,
    align: 'center',
    type: 'weight',
    editor: { control: 'number', precision: 8, min: 0, controls: false },
  },
  settlementMode: {
    key: 'settlementMode',
    labelKey: 'modules.columns.settlementMode',
    width: 76,
    ellipsis: false,
    align: 'center',
    editor: { control: 'settlementMode' },
  },
  weighWeightTon: {
    key: 'weighWeightTon',
    labelKey: 'modules.columns.weighWeight',
    width: 86,
    ellipsis: false,
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
    ellipsis: false,
    align: 'center',
    type: 'weight',
    editor: { control: 'number', precision: 8, controls: true },
  },
  weightAdjustmentAmount: {
    key: 'weightAdjustmentAmount',
    labelKey: 'modules.columns.weightAdjustmentAmount',
    width: 90,
    ellipsis: false,
    align: 'center',
    type: 'amount',
    editor: { control: 'number', precision: 2, controls: true },
  },
  actualWeightTon: {
    key: 'actualWeightTon',
    labelKey: 'modules.columns.weighWeight',
    width: 96,
    ellipsis: false,
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
    width: 92,
    ellipsis: false,
    printWidth: 96,
    align: 'center',
    type: 'amount',
    editor: { control: 'number', precision: 2, min: 0, controls: false },
  },
  amount: {
    key: 'amount',
    labelKey: 'modules.columns.amount',
    width: 100,
    ellipsis: false,
    printWidth: 108,
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
