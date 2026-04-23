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

export interface ModuleFormFieldOption {
  label: string
  value: string
}

export interface ModuleFilterDefinition {
  key: string
  label: string
  type: ModuleFilterType
  placeholder?: string
  options?: ModuleFilterOption[]
}

export interface ModuleColumnDefinition {
  title: string
  dataIndex: string
  width?: number
  align?: 'left' | 'center' | 'right'
  type?: ModuleColumnType
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
  options?: ModuleFormFieldOption[]
  required?: boolean
  disabled?: boolean
  defaultValue?: string | number
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
  filters: ModuleFilterDefinition[]
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
}
