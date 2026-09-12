import type { ReactNode } from 'react'
import type { ModuleKey } from '@/module-system/core/module-key'
import type {
  LegacyModuleRecord,
  LegacyModuleRecordInput,
} from '@/types/module-record'

export interface MasterOption {
  label: string
  value: string | number | boolean
}

export interface MasterFilterSpec {
  key: string
  type: 'input' | 'select'
  placeholder?: string
  width?: number
  options?: MasterOption[]
}

export interface MasterColumnSpec {
  key: string
  title: string
  width: number
  align?: 'left' | 'center' | 'right'
  status?: boolean
  render?: (row: LegacyModuleRecord) => ReactNode
}

export interface MasterDetailFieldSpec {
  key: string
  label: string
  status?: boolean
  render?: (row: LegacyModuleRecord) => ReactNode
}

export interface MasterFormFieldSpec {
  key: string
  label: string
  type: 'input' | 'select' | 'number' | 'textarea'
  required?: boolean
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  fullRow?: boolean
  defaultValue?: unknown
  min?: number
  precision?: number
  options?: MasterOption[]
  visibleWhen?: (values: Record<string, unknown>) => boolean
}

export type MasterFormValues = Record<string, unknown>

export interface MasterDataPageSpec {
  moduleKey: ModuleKey
  title: string
  description: string
  keywordPlaceholder: string
  /** 自动生成的业务编码字段名；新建时经编码签发接口填充。 */
  primaryNoKey?: string
  filters: MasterFilterSpec[]
  columns: MasterColumnSpec[]
  defaultHiddenColumnKeys: string[]
  detailFields: MasterDetailFieldSpec[]
  formFields: MasterFormFieldSpec[]
  rowHighlightStatuses?: string[]
  buildValues: (record: LegacyModuleRecord | null) => MasterFormValues
  buildRecord: (
    values: MasterFormValues,
    base: LegacyModuleRecord | null,
  ) => LegacyModuleRecordInput
  overview?: (
    rows: LegacyModuleRecord[],
    selected: LegacyModuleRecord[],
  ) => Array<{ label: string; value: string }>
}
