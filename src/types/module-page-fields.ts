import type { ReactNode } from 'react'
import type { ModuleRecord, ModuleRecordInput } from '@/types/module-page'

export type ModuleColumnType =
  | 'text'
  | 'amount'
  | 'weight'
  | 'status'
  | 'date'
  | 'datetime'
  | 'count'
  | 'boolean'

export type ModuleFilterType = 'input' | 'select' | 'dateRange'

export type ModuleFormFieldType =
  | 'input'
  | 'select'
  | 'autoComplete'
  | 'multiSelect'
  | 'date'
  | 'textarea'
  | 'number'

export interface ModuleFilterOption {
  label: string
  value: string | number | boolean
}

export interface ModuleFilterOptionGroup {
  label: string
  options: ModuleFilterOption[]
}

export type ModuleFilterOptionEntry =
  | ModuleFilterOption
  | ModuleFilterOptionGroup

export type ModuleFilterOptionResolver = (
  filters: ModuleRecordInput,
) => ModuleFilterOptionEntry[]

export interface ModuleFormFieldOption {
  label: string
  value: string | number | boolean
  customerCode?: string
  customerName?: string
  projectName?: string
  projectNameAbbr?: string
  settlementCompanyId?: string | number
  settlementCompanyName?: string
  purchaseWeighRequired?: boolean
}

export type ModuleFormFieldOptionResolver = (
  form?: ModuleRecordInput,
) => ModuleFormFieldOption[]

export interface ModuleMasterOptionRequirements {
  suppliers?: boolean
  customers?: boolean
  projects?: boolean
  carriers?: boolean
  settlementCompanies?: boolean
  warehouses?: boolean
  materialCategories?: boolean
  materials?: boolean
}

export interface ModuleFilterDefinition {
  key: string
  label: string
  type: ModuleFilterType
  placeholder?: string
  clientSearchKeys?: string[]
  clientSearchLineItemKeys?: string[]
  options?: ModuleFilterOptionEntry[] | ModuleFilterOptionResolver
  row?: number
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
  render?: (value: unknown, record: ModuleRecord) => ReactNode
}

export interface ModuleDetailField {
  label: string
  key: string
  type?: ModuleColumnType
  row?: number
  fullRow?: boolean
}

export interface ModuleFormFieldDefinition {
  key: string
  label: string
  type: ModuleFormFieldType
  placeholder?: string
  options?: ModuleFormFieldOption[] | ModuleFormFieldOptionResolver
  masterOptionRequirements?: ModuleMasterOptionRequirements
  required?: boolean
  disabled?: boolean
  disabledWhen?: (form?: ModuleRecordInput) => boolean
  visibleWhen?: (form?: ModuleRecordInput) => boolean
  preserve?: boolean
  allowClear?: boolean
  defaultValue?: string | number | boolean
  min?: number
  precision?: number
  step?: number
  controls?: boolean
  dateFormat?: string
  showTime?: boolean
  maxLength?: number
  showCount?: boolean
  readonlyWhenLocked?: boolean
  row?: number
  colSpan?: number
  fullRow?: boolean
}
