import type { ReactNode } from 'react'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleColumnDefinition,
  ModuleDetailField,
  ModuleFilterDefinition,
  ModuleFormFieldDefinition,
  ModuleQuickFilterDefinition,
} from '@/types/module-page-fields'
import type {
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-record'
import type {
  TradeLineItemEditorSemantics,
  TradeLineItemFieldKey,
} from '@/types/trade-line-item-fields'

export type {
  ModuleColumnDefinition,
  ModuleColumnType,
  ModuleDetailField,
  ModuleFilterDefinition,
  ModuleFilterOption,
  ModuleFilterOptionEntry,
  ModuleFilterOptionGroup,
  ModuleFilterOptionResolver,
  ModuleFilterType,
  ModuleFormFieldDefinition,
  ModuleFormFieldHint,
  ModuleFormFieldOption,
  ModuleFormFieldOptionResolver,
  ModuleFormFieldType,
  ModuleMasterOptionRequirements,
  ModuleQuickFilterDefinition,
} from '@/types/module-page-fields'

export type {
  ListColumnSettings,
  UserColumnSettingsPayload,
} from '@/types/module-page-settings'

export type {
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-record'

export interface ModuleStatusMeta {
  text: string
  color: 'default' | 'success' | 'processing' | 'warning' | 'error' | 'cyan'
  /** 状态的业务含义说明（悬浮提示），如「已审核=等待入库」 */
  hint?: string
}

export interface ModuleOverviewItem {
  label: string
  value: string
  /**
   * 汇总口径（「已选 15 项」/「本页合计」）。
   *
   * <p>渲染层把**相邻且 scope 相同**的指标归为一组，口径文字只出现一次，
   * 组内依次是各指标。缺省表示无口径（未勾选时的普通汇总、库存页等），按平铺渲染。</p>
   */
  scope?: string
  /**
   * 该指标就是「这几行一共几条」（单据数量 / 记录数量 / 对账单数量 / 主数据数量 …）。
   *
   * <p>勾选口径下「已选 N 项」说的就是同一个数字，再渲染一次「单据数量：N 张」等于同一个
   * 数在同一行出现两次。因此 `buildScopedOverview` 会在勾选口径里丢掉带此标记的指标；
   * 未勾选（本页合计）时照常显示 —— 那时没有别的地方能读到这条数。</p>
   */
  countsRows?: boolean
}

export interface ModuleActionDefinition {
  key?: string
  label: string
  type?: 'primary' | 'default' | 'dashed'
  danger?: boolean
  disabled?: boolean
  loading?: boolean
  /** 置灰原因等补充说明; 有值时按钮外层包 Tooltip, 悬停与读屏都能获知限制条件。 */
  tooltip?: string
}

export interface ModuleParentImportDefinition {
  parentModuleKey: ModuleKey
  label: string
  parentFieldKey: string
  parentDisplayFieldKey: string
  buttonText?: string
  allowMultipleSelection?: boolean
  replaceUnlinkedItemsOnFirstImport?: boolean
  candidateStatementModuleKey?: 'customer-statement' | 'freight-statement'
  buildParentFilters?: (
    currentRecord: ModuleRecordInput,
  ) => Record<string, unknown>
  validateBeforeOpen?: (currentRecord: ModuleRecordInput) => string | null
  remainingQuantityKey?: string
  candidateQueryType?:
    | 'purchase-order-import'
    | 'sales-order-purchase-source'
    | 'freight-sales-order-import'
    | 'sales-order-outbound-import'
  useCandidateSnapshot?: boolean
  hiddenSelectorColumnKeys?: string[]
  visibleWhen?: (currentRecord: ModuleRecordInput) => boolean
  resolveParentSelector?: (currentRecord: ModuleRecordInput) => {
    parentModuleKey: ModuleKey
    parentDisplayFieldKey: string
  }
  requiredSourceItemIdField?:
    | 'sourcePurchaseOrderItemId'
    | 'sourceSalesOrderItemId'
  mapParentToDraft?: (parentRecord: ModuleRecord) => Partial<ModuleRecord>
  transformItems?: (parentRecord: ModuleRecord) => ModuleLineItem[]
  validateParentImport?: (args: {
    currentRecord: ModuleRecordInput
    currentItems: ModuleLineItem[]
    currentParentNos: string[]
    parentRecord: ModuleRecord
  }) => string | null
  /**
   * 导入完成后的非阻断预警: 返回提示文案时以 warning 提示，但仍保留已导入明细。
   * <p>
   * 与 {@link validateParentImport} 的区别是「语义」而不是「时机」: 前者拦截导入，
   * 后者只提醒人工复核(如销售订单导入的品牌/材质超出项目约定范围)。
   */
  warnParentImport?: (args: {
    currentRecord: ModuleRecordInput
    /** 本次新导入的明细行(不含导入前已存在的行)。 */
    importedItems: ModuleLineItem[]
    parentRecords: ModuleRecord[]
  }) => string | null
}

export interface ModuleParentImportSource {
  parentModuleKey: ModuleKey
  parentRecordId: string
}

export interface ModuleColumnOverride {
  /** 覆盖公共字段的多语言 label key；缺省使用公共目录 labelKey。 */
  labelKey?: string
  width?: number
  align?: ModuleColumnDefinition['align']
  type?: ModuleColumnDefinition['type']
  editor?: Partial<TradeLineItemEditorSemantics>
  /** 模块级自定义单元格渲染（如红字金额负数红色），仅覆盖本模块字段。 */
  render?: (value: unknown) => ReactNode
}

export type ModuleItemColumnKey<PrivateKey extends string = never> =
  | TradeLineItemFieldKey
  | PrivateKey

export type ModuleItemColumnDefinition<PrivateKey extends string = string> =
  Omit<ModuleColumnDefinition, 'dataIndex'> & {
    dataIndex: PrivateKey
    editor?: TradeLineItemEditorSemantics
  }

export interface ModuleItemColumnProjections<
  PrivateKey extends string = never,
> {
  /** 详情专用投影（dataIndex 顺序即展示顺序）；缺省回退到解析后的 itemColumns。 */
  detail?: ModuleItemColumnKey<PrivateKey>[]
  /** 保存结果摘要只读投影；缺省回退到解析后的 itemColumns。 */
  saveResult?: ModuleItemColumnKey<PrivateKey>[]
}

/**
 * 明细列配置驱动入口：由模块显式声明字段白名单、顺序、覆盖、默认隐藏与场景投影。
 * 解析结果通过 itemColumns / detailItemColumns 兼容输出，组件层的调用协议不变。
 */
export interface ModuleItemColumnConfig<PrivateKey extends string = never> {
  /** 模块可用字段的显式白名单，数组顺序即默认展示顺序；未声明字段不会进入最终列。 */
  include: ModuleItemColumnKey<PrivateKey>[]
  /** 模块对公共字段展示属性的覆盖；覆盖目标必须存在于公共目录。 */
  overrides?: Partial<Record<TradeLineItemFieldKey, ModuleColumnOverride>>
  /** 默认隐藏但允许列设置恢复的字段；必须属于 include。 */
  hiddenByDefault?: ModuleItemColumnKey<PrivateKey>[]
  /** 编辑器必填展示语义（区别于后端请求 DTO 校验）；字段 key 必须属于 include。 */
  requiredFieldKeys?: ModuleItemColumnKey<PrivateKey>[]
  /** 仅模块拥有的字段定义，参与编辑器与详情投影，不提升到公共目录。 */
  privateColumns?: ModuleItemColumnDefinition<PrivateKey>[]
  /** 场景独立投影：编辑器、详情、保存结果摘要。 */
  projections?: ModuleItemColumnProjections<PrivateKey>
}

/** 明细工具栏附加操作的上下文（由编辑器注入）。 */
export interface ModuleItemsActionsContext {
  /** 当前单据表单值（含送货日期、项目等）。 */
  formValues: Record<string, unknown>
  /** 当前单据状态（来自记录，销售订单表单不含状态字段）。 */
  currentStatus: string
  /** 当前明细行。 */
  items: ModuleLineItem[]
  /** 批量更新明细行（传入 updater 返回新数组）。 */
  setItems: (updater: (items: ModuleLineItem[]) => ModuleLineItem[]) => void
  /** 保存中（用于禁用按钮）。 */
  saving: boolean
  /** 写入表单字段（如交付核定所选价格规定 id）。 */
  setFormValue: (key: string, value: unknown) => void
  /** 当前可选项目（含网价浮动约定）。 */
  projectOptions: ModuleProjectOption[]
}

/** 项目选项最小契约（供明细动作读取网价浮动）。 */
export interface ModuleProjectOption {
  id: string
  projectName: string
  priceFloatMode?: 'ADD' | 'SUBTRACT'
  priceFloatValue?: number
  /** 项目上次交付核定使用的价格规定ID。 */
  lastPriceRuleId?: string
  /** 默认取价数据源: MYSTEEL/STEELX。 */
  quoteSource?: 'MYSTEEL' | 'STEELX'
  /** 默认取价地区(西本城市中文名)。 */
  quoteRegion?: string
}

export interface ModulePageConfig {
  key: ModuleKey
  title: string
  kicker: string
  description: string
  primaryNoKey?: string
  /** 新建时显示由服务端签发的只读主编号。 */
  showGeneratedPrimaryNoOnCreate?: boolean
  readOnly?: boolean
  allowManualCreate?: boolean
  /** 是否隐藏通用关键词筛选；未配置时默认显示。 */
  hideKeywordFilter?: boolean
  /** 列表首次加载及重置时使用的默认服务端筛选。 */
  defaultFilters?: SearchParams
  filters: ModuleFilterDefinition[]
  quickFilters?: ModuleQuickFilterDefinition[]
  columns: ModuleColumnDefinition[]
  defaultHiddenColumnKeys?: string[]
  detailFields: ModuleDetailField[]
  detailColumnCount?: number
  detailActionLabel?: string
  detailItemTitle?: string
  formFields?: ModuleFormFieldDefinition[]
  parentImport?: ModuleParentImportDefinition
  itemColumns?: ModuleColumnDefinition[]
  /** 明细列配置驱动入口；解析结果供 itemColumns / detailItemColumns 兼容输出。 */
  itemColumnConfig?: ModuleItemColumnConfig<string>
  detailItemColumns?: ModuleColumnDefinition[]
  /** 保存结果摘要只读投影（由 itemColumnConfig.projections.saveResult 解析），组件消费且不再硬编码字段白名单。 */
  saveResultItemColumns?: ModuleColumnDefinition[]
  data: ModuleRecord[]
  actions?: ModuleActionDefinition[]
  /** 明细工具栏附加操作（如销售订单交付核定的「整单取网价」）。 */
  renderItemsActions?: (ctx: ModuleItemsActionsContext) => ReactNode
  /**
   * 只读详情面（详情弹窗 / 列表行「+」展开）的附加节点。
   *
   * <p>用途: 承载"值不在明细行上"的派生展示的数据准备。典型例子是销售订单的「网价匹配」列:
   * 匹配结果由页面级快照提供, 只读面没有取价工具栏, 必须在这里发起核查, 否则该列永远显示
   * 「未核查」且提示语指向一个不存在的按钮。挂载点必须是纯副作用/只读节点, 不得写入单据数据。</p>
   */
  renderDetailExtras?: (ctx: { record: ModuleRecord }) => ReactNode
  buildOverview: (rows: ModuleRecord[]) => ModuleOverviewItem[]
  /**
   * 列表默认服务端排序（`sortBy` + `direction`，字段必须在后端
   * `PageSortFieldCatalog` 的白名单内）。
   *
   * <p>语义: **缺省由后端决定** —— 各接口自行调用 `PageQuery.toPageable('xxx')`
   * 给出默认排序字段, 前端不重复声明, 也不猜测。只有"后端默认排序不符合业务习惯"
   * 的页面才在这里覆盖。</p>
   *
   * <p>消费点唯一: `useBusinessGridData` 读取后透传给 `useInfiniteBusinessItems`
   * （→ `buildQueryParams` → `sortBy`/`direction` 查询参数）。不要在其它 hook 里
   * 再读一次, 否则同一排序会有两个出口。</p>
   *
   * <p>当前唯一覆盖: `/operation-log` —— 审计日志的默认任务是"看最新发生了什么",
   * 而后端默认按 `operationTime` 升序, 26 万条数据下最新日志落在最后一页, 等于不可用。</p>
   */
  defaultSort?: { field: string; direction: 'asc' | 'desc' }
  statusMap?: Record<string, ModuleStatusMeta>
  rowHighlightStatuses?: string[]
  saveFields?: {
    scalar?: string[]
    lineItem?: string[]
    computed?: string[]
  }
}
