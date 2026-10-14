import type { ReactNode } from 'react'
import type { ModuleRecord, ModuleRecordInput } from '@/types/module-record'
import type { TradeLineItemEditorSemantics } from '@/types/trade-line-item-fields'

export type ModuleColumnType =
  | 'text'
  | 'amount'
  | 'weight'
  | 'status'
  | 'date'
  | 'datetime'
  | 'count'
  | 'boolean'

export type ModuleFilterType = 'input' | 'select' | 'dateRange' | 'segmented'

/** 字段说明文案：静态字符串，或按当前表单值动态求值（返回空表示不展示）。 */
export type ModuleFormFieldHint =
  | string
  | ((form?: ModuleRecordInput) => string | null | undefined)

export type ModuleFormFieldType =
  | 'input'
  | 'select'
  | 'autoComplete'
  | 'multiSelect'
  | 'date'
  | 'textarea'
  | 'number'
  | 'upload'
  /** 少量互斥选项（2-5 个）的分段控制器；与筛选栏的 `segmented` 同名同形。 */
  | 'segmented'

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
  materialGrades?: boolean
  materials?: boolean
}

export interface ModuleFilterDefinition {
  key: string
  label: string
  type: ModuleFilterType
  placeholder?: string
  /** 是否显示日期范围的快捷日期选择器；默认显示。 */
  showQuickDateFilter?: boolean
  /** 当前筛选值变化时一并清理的级联筛选字段。 */
  resetKeysOnChange?: string[]
  /** 仅用于日期范围筛选；false 表示默认不回填日期范围。 */
  defaultDateRange?:
    | false
    | {
        monthsBefore?: number
        monthsAfter?: number
      }
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
  editor?: TradeLineItemEditorSemantics
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
  /**
   * 字段级自定义校验：返回错误文案表示不通过，返回空表示通过。
   *
   * <p>用于 antd 通用规则表达不了的业务约束（如「固定运费金额需大于 0」「两个字段互斥」）。
   * 依赖 `visibleWhen` 的字段隐藏时整块 Form.Item 被卸载，本校验自然不再执行。</p>
   */
  validate?: (
    value: unknown,
    form?: ModuleRecordInput,
  ) => string | null | undefined
  /**
   * 字段级说明文案（短提示直接展示；长说明请同时给 `tooltip`，
   * 以便读屏用户仍能通过 `aria-describedby` 读到，见 docs/antd-conventions.md）。
   * 传函数时按当前表单值动态求值，可随其它字段（如结算方式）切换说明。
   */
  extra?: ModuleFormFieldHint
  /** 与 `extra` 同源的悬浮说明，仅用于补充视觉提示。 */
  tooltip?: ModuleFormFieldHint
  row?: number
  colSpan?: number
  fullRow?: boolean
  /**
   * 所属区块标题(已翻译文案)。相邻且相同的字段在编辑弹层里归为一组并渲染分割线；
   * 不声明则保持平铺，未分区的模块不受影响。
   */
  section?: string
}
