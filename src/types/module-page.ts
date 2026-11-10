import type { FormInstance } from 'antd'
import type { ComponentType, ReactNode } from 'react'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { SearchParams } from '@/types/api-raw'
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
import type {
  TradeLineItemEditorSemantics,
  TradeLineItemFieldKey,
} from '@/types/trade-line-item-fields'

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
  ModuleFormFieldHint,
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
  color: 'default' | 'success' | 'processing' | 'warning' | 'error' | 'cyan'
  /** 状态的业务含义说明（悬浮提示），如「已审核=等待入库」 */
  hint?: string
}

export interface ModuleOverviewItem {
  label: string
  value: string
  /**
   * 汇总口径（「已选 15 项」/「本页合计」）。
   *
   * <p>渲染层把**相邻且 scope 相同**的指标归为一组，口径文字只出现一次，
   * 组内依次是各指标。缺省表示无口径（未勾选时的普通汇总、库存页等），按平铺渲染。</p>
   */
  scope?: string
  /**
   * 该指标就是「这几行一共几条」（单据数量 / 记录数量 / 对账单数量 / 主数据数量 …）。
   *
   * <p>勾选口径下「已选 N 项」说的就是同一个数字，再渲染一次「单据数量：N 张」等于同一个
   * 数在同一行出现两次。因此 `buildScopedOverview` 会在勾选口径里丢掉带此标记的指标；
   * 未勾选（本页合计）时照常显示 —— 那时没有别的地方能读到这条数。</p>
   */
  countsRows?: boolean
  /**
   * 口径的机器可读标识（`scope` 是给人看的文案，这个是给渲染层分组用的）。
   *
   * <p>列表页把两种口径渲染到两个位置：勾选口径的合计进表格上方的「已选择 N 项」横幅，
   * 本页口径留在页脚。按文案字符串匹配会被 i18n / 文案微调打断，因此另存一个稳定标识。</p>
   */
  scopeKey?: 'page' | 'selection'
}

export interface ModuleActionDefinition {
  key?: string
  label: string
  type?: 'primary' | 'default' | 'dashed'
  danger?: boolean
  disabled?: boolean
  loading?: boolean
  /** 置灰原因等补充说明; 有值时按钮外层包 Tooltip, 悬停与读屏都能获知限制条件。 */
  tooltip?: string
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
  /**
   * 导入完成后的非阻断预警: 返回提示文案时以 warning 提示，但仍保留已导入明细。
   * <p>
   * 与 {@link validateParentImport} 的区别是「语义」而不是「时机」: 前者拦截导入，
   * 后者只提醒人工复核(如销售订单导入的品牌/材质超出项目约定范围)。
   */
  warnParentImport?: (args: {
    currentRecord: ModuleRecordInput
    /** 本次新导入的明细行(不含导入前已存在的行)。 */
    importedItems: ModuleLineItem[]
    parentRecords: ModuleRecord[]
  }) => string | null
}

export interface ModuleParentImportSource {
  parentModuleKey: ModuleKey
  parentRecordId: string
}

export interface ModuleColumnOverride {
  /** 覆盖公共字段的多语言 label key；缺省使用公共目录 labelKey。 */
  labelKey?: string
  width?: number
  align?: ModuleColumnDefinition['align']
  type?: ModuleColumnDefinition['type']
  editor?: Partial<TradeLineItemEditorSemantics>
  /** 模块级自定义单元格渲染（如红字金额负数红色），仅覆盖本模块字段。 */
  render?: (value: unknown) => ReactNode
}

export type ModuleItemColumnKey<PrivateKey extends string = never> =
  | TradeLineItemFieldKey
  | PrivateKey

export type ModuleItemColumnDefinition<PrivateKey extends string = string> =
  Omit<ModuleColumnDefinition, 'dataIndex'> & {
    dataIndex: PrivateKey
    editor?: TradeLineItemEditorSemantics
  }

export interface ModuleItemColumnProjections<
  PrivateKey extends string = never,
> {
  /** 详情专用投影（dataIndex 顺序即展示顺序）；缺省回退到解析后的 itemColumns。 */
  detail?: ModuleItemColumnKey<PrivateKey>[]
  /** 保存结果摘要只读投影；缺省回退到解析后的 itemColumns。 */
  saveResult?: ModuleItemColumnKey<PrivateKey>[]
}

/**
 * 明细列配置驱动入口：由模块显式声明字段白名单、顺序、覆盖、默认隐藏与场景投影。
 * 解析结果通过 itemColumns / detailItemColumns 兼容输出，组件层的调用协议不变。
 */
export interface ModuleItemColumnConfig<PrivateKey extends string = never> {
  /** 模块可用字段的显式白名单，数组顺序即默认展示顺序；未声明字段不会进入最终列。 */
  include: ModuleItemColumnKey<PrivateKey>[]
  /** 模块对公共字段展示属性的覆盖；覆盖目标必须存在于公共目录。 */
  overrides?: Partial<Record<TradeLineItemFieldKey, ModuleColumnOverride>>
  /** 默认隐藏但允许列设置恢复的字段；必须属于 include。 */
  hiddenByDefault?: ModuleItemColumnKey<PrivateKey>[]
  /** 编辑器必填展示语义（区别于后端请求 DTO 校验）；字段 key 必须属于 include。 */
  requiredFieldKeys?: ModuleItemColumnKey<PrivateKey>[]
  /** 仅模块拥有的字段定义，参与编辑器与详情投影，不提升到公共目录。 */
  privateColumns?: ModuleItemColumnDefinition<PrivateKey>[]
  /** 场景独立投影：编辑器、详情、保存结果摘要。 */
  projections?: ModuleItemColumnProjections<PrivateKey>
}

/** 明细工具栏附加操作的上下文（由编辑器注入）。 */
export interface ModuleItemsActionsContext {
  /** 当前单据表单值（含送货日期、项目等）。 */
  formValues: Record<string, unknown>
  /** 当前单据状态（来自记录，销售订单表单不含状态字段）。 */
  currentStatus: string
  /** 当前明细行。 */
  items: ModuleLineItem[]
  /** 批量更新明细行（传入 updater 返回新数组）。 */
  setItems: (updater: (items: ModuleLineItem[]) => ModuleLineItem[]) => void
  /** 保存中（用于禁用按钮）。 */
  saving: boolean
  /** 写入表单字段（如交付核定所选价格规定 id）。 */
  setFormValue: (key: string, value: unknown) => void
  /** 当前可选项目（含网价浮动约定）。 */
  projectOptions: ModuleProjectOption[]
}

/** 项目选项最小契约（供明细动作读取网价浮动）。 */
export interface ModuleProjectOption {
  id: string
  projectName: string
  priceFloatMode?: 'ADD' | 'SUBTRACT'
  priceFloatValue?: number
  /** 项目上次交付核定使用的价格规定ID。 */
  lastPriceRuleId?: string
  /** 默认取价数据源: MYSTEEL/STEELX。 */
  quoteSource?: 'MYSTEEL' | 'STEELX'
  /** 默认取价地区(西本城市中文名)。 */
  quoteRegion?: string
}

/**
 * 单据附加费用行的最小契约。
 *
 * <p>编辑器附加节点只需要「费用金额合计」这一个口径，不依赖费用行的完整结构；
 * 用最小契约可以让 `types/` 层不反向依赖 `views/` 里的草稿类型。</p>
 */
export interface ModuleChargeAmountItem {
  amount: number
}

/** 编辑器附加节点的上下文（由 ModuleEditorWorkspace 注入）。 */
export interface ModuleEditorExtrasContext {
  /**
   * 当前编辑器记录：持久化记录的字段 + 实时表单值 + 明细行。
   *
   * <p>新建时没有 `id`（`ModuleRecordInput` 的 `id` 是可选的），因此类型用它而不是
   * `ModuleRecord`（后者要求 `id` 必填）。</p>
   */
  record: ModuleRecordInput
  /** antd 表单实例：需要直接读某个字段时用它，不要自己再 `Form.useForm`。 */
  form: FormInstance<ModuleRecordInput>
  /** 当前明细行。 */
  items: ModuleLineItem[]
  /** 附加费用行（独立通道）：与明细一起决定「含本单」合计。 */
  expenseItems: readonly ModuleChargeAmountItem[]
}

/**
 * 详情指标条上的一格指标（纯展示，不含业务计算）。
 *
 * <p>数值口径由调用方算好后传入：本层不认字段名、不做单位换算，避免同一个合计
 * 在指标条与明细表里各算一遍（同一口径只在一处实现）。</p>
 */
export interface ModuleDetailMetric {
  /** 稳定 key，用作 React 列表键。 */
  key: string
  /** 次要色 12-14px 标签。 */
  label: string
  /** 主值（卡片式版式里是 26-28px / 700 的大号数字）。 */
  value: ReactNode
  /**
   * 与主值**同一行**的次级说明（如「已用 ¥28.92万」）。
   *
   * <p>卡片式版式把它排在主值右侧、与主值基线对齐，字号比主值小一档：三个数字并列时
   * 读者先看主值，再看「这个百分比对应的绝对值」。缺省不渲染。</p>
   */
  subValue?: ReactNode
  /**
   * 与主值**同一行**的次级说明（10-12px 次要色，调用方自带括号）。
   *
   * <p>保留自上一版紧凑指标条（两行结构）；卡片式版式优先用 {@link subValue}，
   * 两者都给时按 subValue → hint 的顺序排在同一行。</p>
   */
  hint?: ReactNode
  /**
   * 可选图标：渲染在 32px **圆形**浅色底里，底色与图标色都由 `tone` 决定。
   *
   * <p>卡片式版式把它放在**卡片标题行右侧**（参考稿的未对账卡就是右上角一个圆形小图标）。</p>
   */
  icon?: ReactNode
  /**
   * 主值语义色：warning / success 分别取 colorWarningText / colorSuccessText
   * （Text 变体在浅色底上才够 WCAG AA 对比度），缺省用 colorText。
   *
   * <p>`warning` 还会给整卡加 `colorWarningBg` 底色 + `colorWarningBorder` 描边；
   * `primary` / `success` 分别给 `colorPrimaryBg` / `colorSuccessBg` 淡色底与同色系描边
   * （参考稿的四张卡就是「浅蓝 / 浅绿 / 白 / 琥珀」四种底色）。</p>
   */
  tone?: 'default' | 'primary' | 'success' | 'warning'
  /**
   * 卡片标题行右侧的状态胶囊（如「健康」「充足」）。
   *
   * <p>文案由调用方按业务口径给出（本层不判断阈值）；`tone` 只决定颜色：
   * `processing` → 主色、`success` → 成功色、`warning` → 警告色。</p>
   */
  capsule?: ModuleDetailMetricCapsule
  /**
   * 卡片底行的左右两组「标签 + 值」。
   *
   * <p>左组靠左、右组靠右；任一侧没给就不渲染那一侧。参考稿里：
   * 卡1「总额 / 余」、卡2「合同 / 余」、卡3「交货差异率」（只有标签，值在右组）、
   * 卡4「未对账吨位 / 值」。</p>
   */
  stats?: ModuleDetailMetricStats
  /**
   * 进度条百分比（0~100）。**只在显式传入时渲染** 6px 圆角进度条。
   *
   * <p>缺省不渲染进度条，此时卡片底行上方改用一条 1px 分隔线（参考稿的卡 3/卡 4 就是
   * 没有进度条、只有分隔线的形态）。刻度口径由调用方算好（`toBarPercent`），本层不二次判定。</p>
   */
  percent?: number
}

/** 指标卡右上角的状态胶囊。 */
export interface ModuleDetailMetricCapsule {
  /** 胶囊文案（「健康」「充足」「超支」等），由调用方按业务口径给出。 */
  text: string
  /** 颜色语义：processing → 主色 / success → 成功色 / warning → 警告色。 */
  tone: 'success' | 'processing' | 'warning'
}

/** 指标卡底行的一组「标签 + 值」；标签与值都可缺省（只有其一时照样渲染）。 */
export interface ModuleDetailMetricStat {
  label?: ReactNode
  value?: ReactNode
}

/** 指标卡底行的左右两组。 */
export interface ModuleDetailMetricStats {
  left?: ModuleDetailMetricStat
  right?: ModuleDetailMetricStat
}

/**
 * 明细合计行的一格。
 *
 * <p>用 {@link ModuleDetailSummaryCell.dataIndex} 与表头列横向对齐：列多的表一旦错位
 * 整行数字都会串位，因此优先按 dataIndex 匹配列，只有**没有 dataIndex** 的单元格
 * 才退化为按顺序填充。</p>
 */
export interface ModuleDetailSummaryCell {
  /** 稳定 key，用作 React 列表键。 */
  key: string
  /** 对应明细列 `dataIndex`，用于横向对齐。 */
  dataIndex?: string
  /** 单元格内容。 */
  value: ReactNode
  /**
   * 覆盖默认对齐；缺省沿用列定义，其中带 `module-detail-table-cell--numeric` 的
   * 数值列缺省右对齐（合计行要能逐位对上下面的明细数字）。
   */
  align?: 'left' | 'center' | 'right'
}

export interface ModulePageConfig {
  key: ModuleKey
  title: string
  kicker: string
  description: string
  primaryNoKey?: string
  /**
   * 额外需要排到抬头末尾的单号字段（主单号与 `parentImport.parentFieldKey` 之外）。
   *
   * <p>典型场景：销售退货的「销售订单号」是只读来源快照，但该模块没有 `parentImport`
   * （退货候选由接口下发），运行时排序识别不到它，会把它留在第 1 行最前。
   * 显式声明比按 `*No` 后缀猜安全（批号 `batchNo` 同样以 No 结尾，但不是单据号）。</p>
   */
  sourceNoKeys?: readonly string[]
  /** 新建时显示由服务端签发的只读主编号。 */
  showGeneratedPrimaryNoOnCreate?: boolean
  readOnly?: boolean
  allowManualCreate?: boolean
  /** 是否隐藏通用关键词筛选；未配置时默认显示。 */
  hideKeywordFilter?: boolean
  /** 列表首次加载及重置时使用的默认服务端筛选。 */
  defaultFilters?: SearchParams
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
  /** 明细列配置驱动入口；解析结果供 itemColumns / detailItemColumns 兼容输出。 */
  itemColumnConfig?: ModuleItemColumnConfig<string>
  detailItemColumns?: ModuleColumnDefinition[]
  /** 保存结果摘要只读投影（由 itemColumnConfig.projections.saveResult 解析），组件消费且不再硬编码字段白名单。 */
  saveResultItemColumns?: ModuleColumnDefinition[]
  data: ModuleRecord[]
  actions?: ModuleActionDefinition[]
  /** 明细工具栏附加操作（如销售订单交付核定的「整单取网价」）。 */
  renderItemsActions?: (ctx: ModuleItemsActionsContext) => ReactNode
  /**
   * 编辑器（新建/编辑弹层）表单区下方的附加节点。
   *
   * <p>与 {@link renderDetailExtras} 的区别是「编辑中」：这里拿得到实时表单值与明细行，
   * 适合展示随录入变化的派生数据（典型例子：销售订单的「项目数据」，需要把本单草稿合计
   * 作为 pending 传给后端汇总接口）。</p>
   *
   * <p>挂载点必须是**只读**节点：不得写入单据数据、不得触发保存、不得改表单字段
   * —— 保存链路只由编辑器自己的保存动作触发。</p>
   */
  renderEditorExtras?: (ctx: ModuleEditorExtrasContext) => ReactNode
  /**
   * 只读详情面（详情弹窗 / 列表行「+」展开）的附加节点。
   *
   * <p>用途: 承载"值不在明细行上"的派生展示的数据准备。典型例子是销售订单的「网价匹配」列:
   * 匹配结果由页面级快照提供, 只读面没有取价工具栏, 必须在这里发起核查, 否则该列永远显示
   * 「未核查」且提示语指向一个不存在的按钮。挂载点必须是纯副作用/只读节点, 不得写入单据数据。</p>
   */
  renderDetailExtras?: (ctx: { record: ModuleRecord }) => ReactNode
  buildOverview: (rows: ModuleRecord[]) => ModuleOverviewItem[]
  /**
   * 列表默认服务端排序（`sortBy` + `direction`，字段必须在后端
   * `PageSortFieldCatalog` 的白名单内）。
   *
   * <p>语义: **缺省由后端决定** —— 各接口自行调用 `PageQuery.toPageable('xxx')`
   * 给出默认排序字段, 前端不重复声明, 也不猜测。只有"后端默认排序不符合业务习惯"
   * 的页面才在这里覆盖。</p>
   *
   * <p>消费点唯一: `useBusinessGridData` 读取后透传给 `useInfiniteBusinessItems`
   * （→ `buildQueryParams` → `sortBy`/`direction` 查询参数）。不要在其它 hook 里
   * 再读一次, 否则同一排序会有两个出口。</p>
   *
   * <p>当前唯一覆盖: `/operation-log` —— 审计日志的默认任务是"看最新发生了什么",
   * 而后端默认按 `operationTime` 升序, 26 万条数据下最新日志落在最后一页, 等于不可用。</p>
   */
  defaultSort?: { field: string; direction: 'asc' | 'desc' }
  statusMap?: Record<string, ModuleStatusMeta>
  rowHighlightStatuses?: string[]
  saveFields?: {
    scalar?: string[]
    lineItem?: string[]
    computed?: string[]
  }
  /**
   * 只读详情面顶部的指标条插槽。
   *
   * <p>公共层只声明"给我一个能按 record 渲染指标条的节点"，具体渲染哪个组件
   * （通常是 ModuleDetailMetricBar，也可以是页面自定义的）由页面决定，
   * 这样各页面并行改版时不会互相改同一个渲染出口。</p>
   */
  detailMetricsSlot?: ComponentType<{ record: ModuleRecord }>
  /**
   * 明细合计行数据投影。
   *
   * <p>入参是**当前明细行数组**（编辑器里是实时表单值，只读面里是快照），返回按列
   * 对齐的合计单元格；返回 `null` 表示本次不展示合计（空明细或该模块没有合计），
   * 消费方不得据此隐藏整张表格。</p>
   *
   * <p>合计口径必须收敛到调用方的一个函数里，指标条与合计行都取它的结果，
   * 不要在两处各算一遍。</p>
   */
  detailSummary?: (ctx: {
    items: ModuleLineItem[]
  }) => ModuleDetailSummaryCell[] | null
  /**
   * 只读详情面「信息区」的布局形态。
   *
   * <p>**缺省 `'descriptions'`，行为与改造前逐字一致**：全仓 19 个模块共用同一套详情
   * 组件，只有显式声明 `'inline'` 的模块才换成方案 B 的紧凑「标签：值」流式网格
   * （2 列 / md 4 列，长文本整行）。新增形态必须走这个开关，不得直接改默认分支 ——
   * 否则其余模块的详情外观会被一起改掉。</p>
   */
  detailLayout?: 'descriptions' | 'inline'
  /**
   * 只读详情面顶栏右侧的动作区插槽（打印、导出、变更维护等）。
   *
   * <p>**未配置时不渲染右侧容器**，不留空 div。顶栏本身只在
   * `detailLayout === 'inline'` 时渲染。需要"几个按钮 + 可选禁用说明"的简单场景优先用
   * {@link ModulePageConfig.detailHeaderButtons}（声明式、无需新组件）；只有需要完全自定义
   * 交互（下拉、二次确认弹层等）时才用本插槽。</p>
   */
  detailHeaderActions?: ComponentType<{ record: ModuleRecord }>
  /**
   * 只读详情面顶栏右侧的动作按钮（声明式，按顺序渲染在顶栏右端、关闭按钮之前）。
   *
   * <p>未配置时顶栏右侧只有关闭按钮；行展开（`compact`）**不渲染**这些按钮 ——
   * 行展开是列表内嵌视图，不能打断列表上下文去执行单据动作。</p>
   */
  detailHeaderButtons?: readonly ModuleDetailHeaderButton[]
  /**
   * 顶栏左端、「标题 + 单号 + 状态」之后的**关联对象**（如销售订单的「关联项目：…」）。
   *
   * <p>渲染成「竖线 + label：值」，值取 `record[key]` 的字符串形式；值为空时整段不渲染。
   * 未配置时不渲染，不留竖线。</p>
   */
  detailHeaderMeta?: {
    /** 关联对象的文案（含冒号，如「关联项目：」）。 */
    label: string
    /** 从记录上取值的字段 key。 */
    key: string
  }
  /**
   * 顶栏「来源单据」chip：展示本单由哪张上游单据转入。
   *
   * <p>与 {@link ModulePageConfig.detailHeaderMeta} 的分工：meta 是业务上下文（会与信息区
   * 重复，销售订单已改用信息区展示），本字段是**单据身份**——单号 + 复制，属于导航信息，
   * 因此只出现在顶栏。未配置、或记录上该字段为空时不渲染，不留孤立竖线。</p>
   */
  detailHeaderSource?: {
    /** chip 内的类型文案（如「采购订单号」）；由页面配置提供，组件不猜类型。 */
    typeLabel: string
    /** 从记录上取来源单号的字段 key。 */
    key: string
  }
  /**
   * 顶栏是否渲染「单据链」按钮：打开单据流向弹层（图 / 列表 / 时间线）。
   *
   * <p>缺省不渲染；行展开（`compact`）不渲染——那是列表内嵌视图，不承载单据动作。
   * 弹层单号取 `getPrimaryNo` 口径（含记录 id 回退），与详情顶栏展示的是同一个值。</p>
   */
  detailHeaderDocumentFlow?: boolean
  /**
   * 业务信息卡的标题栏文案（方案 B：白卡内「蓝色竖条 + 标题」）。
   *
   * <p>只有配置了才渲染标题栏；未配置时信息卡与改造前一致（没有标题行）。</p>
   */
  detailInfoTitle?: string
  /**
   * 方案 B 信息区里**不再重复展示**的字段 key。
   *
   * <p>顶栏已经呈现的内容（主单号、关联项目等）在信息区重复出现会让同一张单的同一串数字
   * 在上下两处打架。状态标签已由 `hasDetailHeaderStatus` 统一处理，其余字段由页面在这里
   * 显式声明 —— 不在这里做任何字段名猜测。</p>
   */
  detailInfoHiddenKeys?: readonly string[]
}

/** 顶栏右侧的一个动作按钮（声明式配置，见 `ModulePageConfig.detailHeaderButtons`）。 */
export interface ModuleDetailHeaderButton {
  /** 稳定 key，用作 React 列表键。 */
  key: string
  /** 按钮文案。 */
  label: string
  /** 前置图标（可选）。 */
  icon?: ReactNode
  /** `primary` 是主色实心按钮，缺省为白底描边按钮。 */
  variant?: 'default' | 'primary'
  /** 禁用（例如接口尚未接入时先做视觉占位）。 */
  disabled?: boolean
  /** 禁用时的悬停说明（`title`）；未给时不带悬停说明。 */
  disabledHint?: string
  /** 点击回调；禁用或未提供时点击无副作用。 */
  onClick?: (ctx: { record: ModuleRecord }) => void
}
