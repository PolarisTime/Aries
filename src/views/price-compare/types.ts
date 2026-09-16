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

export type ProjectOption = { id: string; name: string; abbr: string }

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
}

export type PriceRow = {
  id: string
  category: string
  material: string
  spec: number | null
  length: string
  /** 报单吨位(手动输入) */
  ton?: number
}

export type SheetInput = {
  ton?: number
  spot?: number
  /** 现货价来源供应商(主数据) */
  supplierId?: string
  supplierName?: string
}

export type SheetInputs = Record<string, SheetInput>

export type PriceSheet = {
  id: string
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
}

export type GridRow = {
  key: string
  rowId: string
  row: PriceRow
}
