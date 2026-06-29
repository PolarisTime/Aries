import type {
  ModuleColumnDefinition,
  ModuleDetailField,
  ModuleFilterDefinition,
  ModuleFormFieldDefinition,
  ModuleQuickFilterDefinition,
} from '@/types/module-page-fields'

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
  ModuleQuickFilterDefinition,
} from '@/types/module-page-fields'

export type {
  ListColumnSettings,
  UserColumnSettingsPayload,
} from '@/types/module-page-settings'

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

export type ModuleRecordInput = {
  id?: string | number
  items?: ModuleRecordInput[]
  [key: string]: unknown
}

export type ModuleLineItem = {
  id: string
  [key: string]: unknown
}

export type ModuleRecord = {
  id: string
  items?: ModuleLineItem[]
  [key: string]: unknown
}

export interface ModuleParentImportDefinition {
  parentModuleKey: string
  label: string
  parentFieldKey: string
  parentDisplayFieldKey: string
  buttonText?: string
  enforceUniqueRelation?: boolean
  allowMultipleSelection?: boolean
  candidateStatementModuleKey?:
    | 'supplier-statement'
    | 'customer-statement'
    | 'freight-statement'
  buildParentFilters?: (currentRecord: ModuleRecord) => Record<string, unknown>
  validateBeforeOpen?: (currentRecord: ModuleRecord) => string | null
  remainingQuantityKey?: string
  candidateQueryType?: 'purchase-order-import' | 'freight-bill-import'
  candidateUsage?: 'purchase-inbound' | 'sales-order'
  mapParentToDraft?: (parentRecord: ModuleRecord) => Partial<ModuleRecord>
  transformItems?: (parentRecord: ModuleRecord) => ModuleLineItem[]
  validateParentImport?: (args: {
    currentRecord: ModuleRecord
    currentItems: ModuleLineItem[]
    currentParentNos: string[]
    parentRecord: ModuleRecord
  }) => string | null
}

export interface ModulePageConfig {
  key: string
  title: string
  kicker: string
  description: string
  primaryNoKey?: string
  hidePageHeader?: boolean
  readOnly?: boolean
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
