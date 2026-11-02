import type { ModuleKey } from '@/module-system/core/module-key'
import { isModuleKey } from '@/module-system/core/module-key'
import type { PrintItemFieldKey } from '@/utils/print-module-config'

/**
 * 打印作业的「模块 → 布局」配置（业内模型：模块 → 单据类型 → 模板 + 打印参数）。
 *
 * <p>背景：弹窗骨架、汇总条、选项区原先对所有模块是同一套，只有 3 处 moduleKey 补丁，
 * 导致采购订单看不到单价金额、收付款单往来对象为空、拆分打印对无件数语义的单据也显示。
 * 这里把「明细列 / Header 往来对象 / 汇总条 / 选项 / 分组 / 滚动 / 是否可打印」收敛为
 * 一份按模块的声明，弹窗各区域只读配置、不再就地判断 moduleKey。</p>
 *
 * <p>`hiddenItemFields` 表示「能力已支持但默认禁用显示」：例如采购订单/入库/出库的
 * 单价与金额列先补齐能力，但默认不显示，需要时删掉对应 key 即可开启。</p>
 *
 * <p>未配置的模块回退 {@link DEFAULT_PRINT_JOB_LAYOUT}（保持改造前行为），因此可以逐模块
 * 切换、随时回退；`printable: false` 只隐藏前端打印入口，不删除后端打印能力。</p>
 */

export interface PrintJobSummarySpec {
  /** 日期行：labelKey + 单据记录取值的候选字段（single 取第一个非空；range 取起止）。 */
  date: {
    labelKey: string
    fields: [string] | [string, string]
    mode: 'single' | 'range'
  } | null
  remark: boolean
  settlementCompany: boolean
  /** 商品类合计。 */
  quantity: boolean
  weight: boolean
  /** 金额类合计：优先用明细 amount 汇总，无明细金额时取表头字段。 */
  amount?: { labelKey: string; headerFields: string[] }
}

export interface PrintJobOptionsSpec {
  hideRemark: boolean
  itemSelection: boolean
  hideUnitPrice: boolean
  brandOverride: boolean
  split: boolean
  merge: boolean
}

export interface PrintJobLayout {
  /** false = 不渲染打印入口（无模板或业务上暂不支持打印）。 */
  printable: boolean
  /** 对账单类：明细按来源单/项目分组渲染。 */
  statementGrouped: boolean
  /** 对账单类：明细区限高滚动。 */
  scrollableItems: boolean
  /** Header 往来对象候选字段（按顺序取第一个非空）。 */
  counterpartyFields: string[]
  itemFields: PrintItemFieldKey[]
  /** 能力已支持但默认禁用显示的列。 */
  hiddenItemFields: PrintItemFieldKey[]
  summary: PrintJobSummarySpec
  options: PrintJobOptionsSpec
}

const COMMODITY_FIELDS: PrintItemFieldKey[] = [
  'brand',
  'category',
  'material',
  'spec',
  'length',
  'quantity',
  'quantityUnit',
  'pieceWeightTon',
  'weightTon',
]

const COMMODITY_FIELDS_WITH_PRICE: PrintItemFieldKey[] = [
  ...COMMODITY_FIELDS,
  'unitPrice',
  'amount',
]

const CUSTOMER_STATEMENT_FIELDS: PrintItemFieldKey[] = [
  'brand',
  'category',
  'material',
  'spec',
  'length',
  'quantity',
  'quantityUnit',
  'pieceWeightTon',
  'weightTon',
  'unitPrice',
  'amount',
]

const FREIGHT_STATEMENT_FIELDS: PrintItemFieldKey[] = [
  'brand',
  'spec',
  'material',
  'category',
  'length',
  'quantity',
  'quantityUnit',
  'pieceWeightTon',
  'weightTon',
]

/** 收付款单明细是分摊行（不存在商品列）。 */
const ALLOCATION_FIELDS: PrintItemFieldKey[] = ['sourceNo', 'amount']

const COMMON_OPTIONS: PrintJobOptionsSpec = {
  hideRemark: true,
  itemSelection: true,
  hideUnitPrice: false,
  brandOverride: false,
  split: false,
  merge: false,
}

const COMMON_SUMMARY = {
  remark: true,
  settlementCompany: true,
  quantity: true,
  weight: true,
}

/** 未配置模块的回退：与改造前一致（商品列、通用汇总、通用选项）。 */
export const DEFAULT_PRINT_JOB_LAYOUT: PrintJobLayout = {
  printable: true,
  statementGrouped: false,
  scrollableItems: false,
  counterpartyFields: [
    'customerName',
    'supplierName',
    'carrierName',
    'counterpartyName',
  ],
  itemFields: COMMODITY_FIELDS,
  hiddenItemFields: [],
  summary: {
    ...COMMON_SUMMARY,
    date: null,
  },
  options: COMMON_OPTIONS,
}

export const PRINT_JOB_LAYOUTS: Partial<Record<ModuleKey, PrintJobLayout>> = {
  'sales-order': {
    printable: true,
    statementGrouped: false,
    scrollableItems: false,
    counterpartyFields: ['customerName'],
    itemFields: COMMODITY_FIELDS_WITH_PRICE,
    hiddenItemFields: [],
    summary: {
      ...COMMON_SUMMARY,
      date: {
        labelKey: 'modules.print.deliveryDate',
        fields: ['deliveryDate'],
        mode: 'single',
      },
    },
    options: {
      ...COMMON_OPTIONS,
      hideUnitPrice: true,
      brandOverride: true,
      split: true,
      merge: true,
    },
  },
  'sales-outbound': {
    printable: true,
    statementGrouped: false,
    scrollableItems: false,
    counterpartyFields: ['customerName'],
    itemFields: COMMODITY_FIELDS_WITH_PRICE,
    // 单价/金额能力已支持，默认禁用显示（需要时移除本行即可开启）。
    hiddenItemFields: ['unitPrice', 'amount'],
    summary: {
      ...COMMON_SUMMARY,
      date: {
        labelKey: 'modules.print.outboundDate',
        fields: ['outboundDate'],
        mode: 'single',
      },
    },
    options: COMMON_OPTIONS,
  },
  'sales-return': {
    // 暂无默认打印模板：先隐藏入口，补齐模板后改为 true。
    printable: false,
    statementGrouped: false,
    scrollableItems: false,
    counterpartyFields: ['customerName'],
    itemFields: COMMODITY_FIELDS_WITH_PRICE,
    hiddenItemFields: [],
    summary: {
      ...COMMON_SUMMARY,
      date: {
        labelKey: 'modules.print.returnDate',
        fields: ['returnDate'],
        mode: 'single',
      },
    },
    options: COMMON_OPTIONS,
  },
  'purchase-order': {
    printable: true,
    statementGrouped: false,
    scrollableItems: false,
    counterpartyFields: ['supplierName'],
    itemFields: COMMODITY_FIELDS_WITH_PRICE,
    // 单价/金额能力已支持，默认禁用显示。
    hiddenItemFields: ['unitPrice', 'amount'],
    summary: {
      ...COMMON_SUMMARY,
      date: {
        labelKey: 'modules.print.orderDate',
        fields: ['orderDate'],
        mode: 'single',
      },
    },
    options: COMMON_OPTIONS,
  },
  'purchase-inbound': {
    printable: true,
    statementGrouped: false,
    scrollableItems: false,
    counterpartyFields: ['supplierName'],
    itemFields: COMMODITY_FIELDS_WITH_PRICE,
    hiddenItemFields: ['unitPrice', 'amount'],
    summary: {
      ...COMMON_SUMMARY,
      date: {
        labelKey: 'modules.print.inboundDate',
        fields: ['inboundDate'],
        mode: 'single',
      },
    },
    options: COMMON_OPTIONS,
  },
  'freight-bill': {
    printable: true,
    statementGrouped: false,
    scrollableItems: false,
    counterpartyFields: ['carrierName'],
    itemFields: COMMODITY_FIELDS,
    hiddenItemFields: [],
    summary: {
      ...COMMON_SUMMARY,
      date: {
        labelKey: 'modules.print.billTime',
        fields: ['billTime'],
        mode: 'single',
      },
      // 物流单明细没有单价/金额，金额合计取表头总运费。
      amount: {
        labelKey: 'modules.print.totalFreight',
        headerFields: ['totalFreight'],
      },
    },
    options: COMMON_OPTIONS,
  },
  'customer-statement': {
    printable: true,
    statementGrouped: true,
    scrollableItems: true,
    counterpartyFields: ['customerName'],
    itemFields: CUSTOMER_STATEMENT_FIELDS,
    hiddenItemFields: [],
    summary: {
      ...COMMON_SUMMARY,
      date: {
        labelKey: 'modules.print.statementPeriod',
        fields: ['startDate', 'endDate'],
        mode: 'range',
      },
      amount: {
        labelKey: 'modules.print.totalAmount',
        headerFields: ['salesAmount'],
      },
    },
    options: COMMON_OPTIONS,
  },
  'freight-statement': {
    printable: true,
    statementGrouped: true,
    scrollableItems: true,
    counterpartyFields: ['carrierName'],
    itemFields: FREIGHT_STATEMENT_FIELDS,
    hiddenItemFields: [],
    summary: {
      ...COMMON_SUMMARY,
      date: {
        labelKey: 'modules.print.statementPeriod',
        fields: ['startDate', 'endDate'],
        mode: 'range',
      },
      amount: {
        labelKey: 'modules.print.totalFreight',
        headerFields: ['totalFreight'],
      },
    },
    options: COMMON_OPTIONS,
  },
  payment: {
    // 暂无默认打印模板：先隐藏入口，补齐模板后改为 true。
    printable: false,
    statementGrouped: false,
    scrollableItems: false,
    counterpartyFields: ['counterpartyName'],
    itemFields: ALLOCATION_FIELDS,
    hiddenItemFields: [],
    summary: {
      ...COMMON_SUMMARY,
      quantity: false,
      weight: false,
      date: {
        labelKey: 'modules.print.paymentDate',
        fields: ['paymentDate'],
        mode: 'single',
      },
      amount: {
        labelKey: 'modules.print.totalAmount',
        headerFields: ['amount'],
      },
    },
    options: {
      ...COMMON_OPTIONS,
      itemSelection: false,
    },
  },
  receipt: {
    printable: false,
    statementGrouped: false,
    scrollableItems: false,
    counterpartyFields: ['counterpartyName'],
    itemFields: ALLOCATION_FIELDS,
    hiddenItemFields: [],
    summary: {
      ...COMMON_SUMMARY,
      quantity: false,
      weight: false,
      date: {
        labelKey: 'modules.print.receiptDate',
        fields: ['receiptDate'],
        mode: 'single',
      },
      amount: {
        labelKey: 'modules.print.totalAmount',
        headerFields: ['amount'],
      },
    },
    options: {
      ...COMMON_OPTIONS,
      itemSelection: false,
    },
  },
}

/** 取模块布局；未配置模块回退默认布局（保持改造前行为）。 */
export function getPrintJobLayout(moduleKey: string): PrintJobLayout {
  if (!isModuleKey(moduleKey)) {
    return DEFAULT_PRINT_JOB_LAYOUT
  }
  return PRINT_JOB_LAYOUTS[moduleKey] ?? DEFAULT_PRINT_JOB_LAYOUT
}
