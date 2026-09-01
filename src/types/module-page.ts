import type { ModuleKey } from '@/module-system/core/module-key'
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
}

export interface ModuleOverviewItem {
  label: string
  value: string
}

export interface ModuleActionDefinition {
  key?: string
  label: string
  type?: 'primary' | 'default' | 'dashed'
  danger?: boolean
  disabled?: boolean
  loading?: boolean
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
  buildOverview: (rows: ModuleRecord[]) => ModuleOverviewItem[]
  statusMap?: Record<string, ModuleStatusMeta>
  rowHighlightStatuses?: string[]
  saveFields?: {
    scalar?: string[]
    lineItem?: string[]
    computed?: string[]
  }
}
