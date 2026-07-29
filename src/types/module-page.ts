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
  color: 'default' | 'success' | 'processing' | 'warning' | 'error'
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
  detailItemColumns?: ModuleColumnDefinition[]
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
