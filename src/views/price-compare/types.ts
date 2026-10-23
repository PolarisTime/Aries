/** 行情数据源: 日期 -> 时段 -> 品牌 -> "品种|材质" -> 规格 -> 网价 */
export type PriceData = Record<
  string,
  Record<string, Record<string, Record<string, Record<string, number>>>>
>

export type Variety = {
  category: string
  material: string
  spec: number
  length: string
  label: string
}

export type ProjectOption = {
  id: string
  name: string
  abbr: string
  /**
   * 项目资料里配置的允许品牌；空数组或未提供表示项目不限制。
   *
   * <p>比价页的「参与品牌」以此为上限——品牌范围的唯一配置入口是项目资料，
   * 比价页不再维护独立清单。</p>
   */
  allowedBrands?: string[]
}

export type BrandOption = { name: string; freight: number }

export type Brand = {
  name: string
  freight: number
  /** 启用品种(类别); 为空表示全部启用。未启用则该品牌在该品种下不显示价格 */
  categories?: string[]
}

/** 项目级配置: 参与品牌(含运费/启用品种) 与 12 米加价 */
export type ProjectConfig = {
  brands: Brand[]
  lengthPremium: number
  /** HRB400 无网价时, 使用 HRB400E 价格兜底(展示前缀 E) */
  hrb400eFallback: boolean
  /** 可选择的商品键(类别|材质|规格|长度); 为空表示全部可选 */
  products?: string[]
  /** 指定品牌(项目级, 仅用于报单展示, 不参与自动过滤) */
  designatedBrands?: string[]
  /** 备注信息(项目级文本) */
  remark?: string
  /** 服务端乐观锁版本号(用于 X-Resource-Version) */
  version?: string
  /** 项目取价数据源: MYSTEEL/STEELX; STEELX 时无品牌, 按规格一行一价。 */
  quoteSource?: 'MYSTEEL' | 'STEELX'
}

/** 行类型: 商品行(默认)/隔断行。 */
export type RowType = 'PRODUCT' | 'SEPARATOR'

export type PriceRow = {
  /**
   * 行级「按 HRB400E 价」开关：勾上后该行所有价格子都按替代牌号带出并打 `E` 角标。
   *
   * <p>默认 `undefined` = 跟随单据头 `allowHrb400eFallback`；显式 `false` 可在单据头开启时
   * 单独关掉某一行（单格例外再走 {@code SheetInput.spotSourceMaterial} 的清除操作）。</p>
   */
  hrb400eFallback?: boolean
  id: string
  /** 缺省视为 PRODUCT, 兼容历史数据与本地新建行。 */
  rowType?: RowType
  category: string
  material: string
  spec: number | null
  length: string
  /** 报单吨位(手动输入) */
  ton?: number
  /** 行级备注 */
  remark?: string
  /** 是否锁定: 未锁定不可关联采购订单; 解锁时清除关联。隔断行恒为 false。 */
  locked?: boolean
  /** 关联采购订单标识(可空): 非空即视为已采购(遮蔽吨位后品牌列); 隔断行恒为空。 */
  purchaseOrderId?: string
  /** 关联采购订单号快照(保存时写入; 供展示兜底)。 */
  purchaseOrderNo?: string
  /** 关联采购订单明细行标识(按规格扣减已开吨位); 等于 purchaseOrderLinks[0]。 */
  purchaseOrderItemId?: string
  /** 多行关联: 一行可挂多张采购订单明细行, 每条带本次开出吨位。 */
  purchaseOrderLinks?: PriceRowPurchaseOrderLink[]
}

/** 行级关联: allocatedTon 是本次在该订单明细行开出的吨位。 */
export type PriceRowPurchaseOrderLink = {
  purchaseOrderId: string
  purchaseOrderNo?: string
  purchaseOrderItemId: string
  allocatedTon: number
}

export type SheetInput = {
  ton?: number
  spot?: number
  /** 现货价来源供应商(主数据) */
  supplierId?: string
  supplierName?: string
  /**
   * 现货价的**来源材质**：该格是按替代牌号代取来的（如行材质 HRB400、按 HRB400E 取价）。
   *
   * <p>落库后重新打开单据仍要能显示「E」角标与来源说明，因此必须存进单据数据，
   * 不能只放在会话内的 store 里。未代取的格子不写该字段（区分"精确匹配"与"代取"）。</p>
   */
  spotSourceMaterial?: string | null
}

export type SheetInputs = Record<string, SheetInput>

export type PriceSheet = {
  /** 本地单据 id(与服务端 id 对齐前只有本地含义) */
  id: string
  /**
   * 服务端单据 id。
   * 与 id 分开保存是为了让渲染期能直接派生"当前批次的 serverId"(编辑锁按 serverId 记账),
   * 不必在渲染期读取可变的 serverIdRef —— 那会破坏 React Compiler 的优化前提。
   */
  serverId?: string
  name: string
  status: string
  projectId: string
  projectName: string
  orderDate: string
  refDate: string
  refPeriod: string
  /** 参考网价锁定: 仅锁定参照日期/时段, 网价仍随刷新变化 */
  locked?: boolean
  /** 锁定规格和数量: 商品选择与数量输入只读 */
  specQuantityLocked?: boolean
  lengthPremium: number
  inputs: SheetInputs
  rows: PriceRow[]
  /** 服务端保存的品牌快照(仅回填配置兜底用) */
  brands?: Brand[]
  remark?: string
  /** 服务端乐观锁版本号(用于 X-Resource-Version) */
  version?: string
  /**
   * 最后保存时间(ISO 8601)。
   * <p>加载时取服务端 updatedAt; 行级写接口只回传版本, 因此写成功后用本地时刻兜底,
   * 保证「仅改单元格」的保存也能刷新保存时间。</p>
   */
  savedAt?: string
}

export type GridRow = {
  key: string
  rowId: string
  row: PriceRow
}
