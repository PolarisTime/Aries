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
  /** `transfer` = 多选但需要浏览/搜索的场景（经营品牌）：表单显示标签，弹窗用表格穿梭框。 */
  type: 'input' | 'select' | 'number' | 'textarea' | 'transfer'
  /** 多选: 仅 select 生效, 用于经营品牌等标签式多值字段。 */
  multiple?: boolean
  required?: boolean
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  fullRow?: boolean
  /**
   * 栅格宽度（24 栅格，默认 6 = 四等分）。
   *
   * <p>只有「内容需要更宽」的字段才放大：经营品牌这类多选标签用 18（三列），
   * 长文本用 24。普通输入保持 6，保证各区块字段竖边对齐。</p>
   */
  span?: 6 | 12 | 18 | 24
  defaultValue?: unknown
  min?: number
  precision?: number
  options?: MasterOption[]
  visibleWhen?: (values: Record<string, unknown>) => boolean
  /** 所属区块标题; 相邻且相同的字段归为一组, 不声明则不渲染区块标题(保持平铺)。 */
  section?: string
}

export type MasterFormValues = Record<string, unknown>

export interface MasterToolbarExtraContext {
  refresh: () => void
  /** 当前单选记录；用于版本历史等仅单选可用的模块专属操作。 */
  selectedRecord?: LegacyModuleRecord
  selectedCount: number
}

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
  /** 工具栏扩展槽：渲染模块专属操作（如商品导入），可调用 refresh 刷新列表。 */
  renderToolbarExtra?: (context: MasterToolbarExtraContext) => ReactNode
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
