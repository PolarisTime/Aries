export type ModuleColumnType =
  | 'text'
  | 'amount'
  | 'weight'
  | 'status'
  | 'date'
  | 'count'

export type ModuleFilterType = 'input' | 'select' | 'dateRange'
export type ModuleFormFieldType = 'input' | 'select' | 'multiSelect' | 'date' | 'textarea' | 'number'

export interface ModuleFilterOption {
  label: string
  value: string
}

export interface ModuleFilterOptionGroup {
  label: string
  options: ModuleFilterOption[]
}

export type ModuleFilterOptionEntry = ModuleFilterOption | ModuleFilterOptionGroup
export type ModuleFilterOptionResolver = (filters: Record<string, unknown>) => ModuleFilterOptionEntry[]

export interface ModuleFormFieldOption {
  label: string
  value: string | number | boolean
}

export type ModuleFormFieldOptionResolver = () => ModuleFormFieldOption[]

export interface ModuleFilterDefinition {
  key: string
  label: string
  type: ModuleFilterType
  placeholder?: string
  options?: ModuleFilterOptionEntry[] | ModuleFilterOptionResolver
}

export interface ModuleQuickFilterDefinition {
  key: string
  label: string
  values: Record<string, string | undefined>
}

export interface ModuleColumnDefinition {
  title: string
  dataIndex: string
  width?: number
  align?: 'left' | 'center' | 'right'
  type?: ModuleColumnType
  required?: boolean
}

export interface ModuleDetailField {
  label: string
  key: string
  type?: ModuleColumnType
}

export interface ModuleStatusMeta {
  text: string
  color: 'default' | 'success' | 'processing' | 'warning' | 'error'
}

export interface ModuleOverviewItem {
  label: string
  value: string
}

export interface ModuleActionDefinition {
  label: string
  type?: 'primary' | 'default' | 'dashed'
  danger?: boolean
}

export interface ModuleFormFieldDefinition {
  key: string
  label: string
  type: ModuleFormFieldType
  placeholder?: string
  options?: ModuleFormFieldOption[] | ModuleFormFieldOptionResolver
  required?: boolean
  disabled?: boolean
  allowClear?: boolean
  defaultValue?: string | number | boolean
  min?: number
  precision?: number
}

export interface ModuleLineItem extends Record<string, unknown> {
  id: string
}

export interface ModuleRecord extends Record<string, unknown> {
  id: string
  items?: ModuleLineItem[]
}

export interface ListColumnSettings {
  orderedKeys: string[]
  hiddenKeys: string[]
}

export interface ModuleParentImportDefinition {
  parentModuleKey: string
  label: string
  parentFieldKey: string
  parentDisplayFieldKey: string
  buttonText?: string
  enforceUniqueRelation?: boolean
  mapParentToDraft?: (parentRecord: ModuleRecord) => Partial<ModuleRecord>
  transformItems?: (parentRecord: ModuleRecord) => ModuleLineItem[]
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
  detailFields: ModuleDetailField[]
  formFields?: ModuleFormFieldDefinition[]
  parentImport?: ModuleParentImportDefinition
  itemColumns?: ModuleColumnDefinition[]
  data: ModuleRecord[]
  actions?: ModuleActionDefinition[]
  buildOverview: (rows: ModuleRecord[]) => ModuleOverviewItem[]
  statusMap?: Record<string, ModuleStatusMeta>
  rowHighlightStatuses?: string[]
  /** Per-module save field schema. Replaces global COMPUTED_FIELD_KEYS + EXTRA_SCALAR_FIELDS + LINE_ITEM_FIELDS. */
  saveFields?: {
    scalar?: string[]
    lineItem?: string[]
    computed?: string[]
  }
}
