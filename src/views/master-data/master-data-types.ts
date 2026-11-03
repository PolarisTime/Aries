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

/** 模块专属字段控件的上下文：当前表单值、正在编辑的记录（新建为 null）。 */
export interface MasterFormFieldRenderContext {
  values: MasterFormValues
  /** 新建时为 null；编辑时可用于读取该记录的服务端附属数据（如品牌规格配置）。 */
  record: LegacyModuleRecord | null
  /** 字段名（`Form.Item` 的 label）：复合控件用作 `aria-label`，读屏才听得到字段含义。 */
  label: string
  disabled?: boolean
}

export interface MasterFormFieldSpec {
  key: string
  label: string
  /** `transfer` = 多选但需要浏览/搜索的场景（经营品牌）：表单显示标签，弹窗用表格穿梭框。 */
  type: 'input' | 'select' | 'number' | 'textarea' | 'transfer'
  /**
   * 模块专属控件：声明后由它渲染该字段的控件，`Form.Item` 仍负责取值与校验
   * （控件的 `value` / `onChange` 由 `Form.Item` 注入）。
   *
   * <p>用于「字段本身是复合编辑器」的场景（如供应商的品牌规格配置：一个字段里要给每个
   * 经营品牌单独开穿梭框）。通用编辑器不需要认识这些模块，模块在自己的 spec 里注入即可。</p>
   */
  render?: (context: MasterFormFieldRenderContext) => ReactNode
  /** 多选: 仅 select 生效, 用于经营品牌等标签式多值字段。 */
  multiple?: boolean
  required?: boolean
  disabled?: boolean
  placeholder?: string
  /**
   * 字段说明（一句话及以上）：同时作为 `tooltip` 与 `extra` 下发 ——
   * ⓘ 图标负责视觉，`extra` 让读屏通过 `aria-describedby` 也能听到（见 AGENTS 排版规范）。
   */
  description?: string
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
  /**
   * 保存成功后的模块专属收尾（如把字段里的附属配置提交到它自己的端点）。
   *
   * <p>{@code saved} 是后端保存后的记录，新建时才有 id 可用 —— 因此「配置需要供应商 id」
   * 这类附属数据只能在保存之后提交（新建供应商时也能一次配完）。抛错会被页面提示为保存失败，
   * 但记录已经落库：错误文案要写清「记录已保存、只有附属配置没存上」。</p>
   */
  afterSave?: (context: {
    values: MasterFormValues
    saved: LegacyModuleRecord
  }) => Promise<void>
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
