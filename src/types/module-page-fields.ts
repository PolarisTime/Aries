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
  /**
   * 商品品牌（供应商「经营品牌」多选）。
   *
   * <p>品牌不是独立主数据接口，而是「商品资料去重后的品牌清单」：与 `useMaterialBrands`
   * 共用同一个查询缓存（`QUERY_KEYS.priceCompare.materialBrands` + `ENDPOINTS.MATERIAL_BRANDS`），
   * 因此声明本需求不会多发请求，只是把同一份缓存提前加载好供 `getBrandOptions` 读取。</p>
   */
  brands?: boolean
  /**
   * 定尺主数据（`/api/v2.0/length-premiums`，只取「正常」状态）。
   *
   * <p>材料资料的「长度」是业务数据而不是自由文本：它的取值必须来自定尺主数据
   * （后端 `MaterialService` 会校验），比价页的定尺加价、排序、互切也都读同一份。
   * 声明本需求后 `useMasterOptions` 会把这批复用范围内的选项加载进缓存，
   * `getLengthOptions` 再从缓存同步读取 —— 否则下拉为空且没有任何报错。</p>
   */
  lengthPremiums?: boolean
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
  /**
   * 在筛选区网格里占几列（默认 1）。
   *
   * <p>只有「一个字段需要比一列更宽」时才用：日期区间要并排显示两个完整日期，
   * 单列（约 350px）放不下，占 2 列后不再被截断。字段总数按「列」计，
   * 折叠阈值仍以 {@link FILTER_VISIBLE_LIMIT} 的列数判断。</p>
   */
  span?: number
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
  /**
   * 编辑器明细表里也让只读单元格走本列的 {@link ModuleColumnDefinition.render}。
   *
   * <p>缺省(false)时编辑器明细表沿用统一的只读格式化(`formatCellValue`), 这是历史行为:
   * 派生数量一类列照旧显示行上的值, 输出不变。**显式声明**才交给列自己的渲染 ——
   * 给"值不在明细行上"的列用, 例如销售订单的「网价匹配」状态列(匹配结果是页面级核查快照、
   * 不写进明细行, 靠列渲染按行 id 订阅), 不声明时只会显示 '-'。</p>
   *
   * <p>只对只读单元格生效: 声明了 editor 或该行可编辑的列仍渲染编辑控件。</p>
   */
  renderInEditor?: boolean
}

export interface ModuleDetailField {
  label: string
  key: string
  type?: ModuleColumnType
  row?: number
  fullRow?: boolean
  /**
   * 是否用「浅灰圆角底框 + 前置小图标」包裹值（只影响方案 B 的流式信息网格）。
   *
   * <p>典型用途是项目名称这类"地址/说明"性质的长值：底框把它从一串短字段里挑出来。
   * 缺省(false)时值就是纯文本 —— 订单备注这类长文本**整行展示但不需要底框**，
   * 因此不能拿「是否整行」当作「是否加框」的判定（两者语义不同，混用会让备注也被框住）。</p>
   */
  boxed?: boolean
  /**
   * 值是否用强调色（错误色）+ 粗体呈现（只影响方案 B 的流式信息网格）。
   *
   * <p>用于总金额这类需要在信息区里被第一眼看到的关键数值；缺省(false)时用正文色。
   * 这是**纯展示标记**，不参与任何格式化或计算（值本身仍由列渲染 / 统一格式化出口产出）。</p>
   */
  emphasis?: boolean
}

export interface ModuleFormFieldDefinition {
  key: string
  label: string
  type: ModuleFormFieldType
  placeholder?: string
  /**
   * 下拉无选项时的空态文案(仅对 select/multiSelect 生效)。
   *
   * <p>antd 默认只说"暂无数据", 用户分不清是"确实没有数据"还是"要先完成上游字段"。声明本字段
   * 后空态可以说清前置条件(例如项目下拉: "请先选择客户"); 未声明时保持 antd 默认表现。</p>
   */
  emptyHint?: string
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
  /**
   * 数值上限（仅 number 类型）。
   *
   * <p>后端常有 0..30 这类区间校验（例如项目资料的「报单日期顺延交易日数」
   * 「休市调整天数」），此前只能靠 `validate` 手写或等提交后 422。
   * 补上后由 `InputNumber` 直接约束输入。</p>
   */
  max?: number
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
  /**
   * 多步录入向导里的步骤序号（1 起）。**仅当页面声明了 `formSteps` 时生效**。
   *
   * <p>刻意不叫 `step`：那个名字已被 {@link ModuleFormFieldDefinition.step} 占用于
   * `InputNumber` 的数值步进，语义完全不同。</p>
   *
   * <p>未声明 `formStep` 的字段在向导模式下不渲染任何一步 —— 这正好承接
   * `visibleWhen: () => false` 的隐藏字段（如收款单的状态字段），不会在末步突然冒出来。</p>
   */
  formStep?: number
}

/** 多步录入向导的一步（页面配置 `formSteps` 的元素）。 */
export interface ModuleFormStep {
  /** 步骤标题（已翻译文案）。 */
  title: string
  /** 步骤副标题，用来一句话说明这一步在填什么（可选）。 */
  subTitle?: string
}
