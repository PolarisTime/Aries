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

export type Brand = { name: string; freight: number }

export type SheetGroup = {
  id: string
  name: string
}

export type PriceRow = {
  id: string
  groupId: string
  category: string
  material: string
  spec: number | null
  length: string
}

export type SheetInput = { ton?: number; spot?: number }
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
  lengthPremium: number
  locked: boolean
  inputs: SheetInputs
  groups: SheetGroup[]
  rows: PriceRow[]
}

export type GridRow = {
  key: string
  isGroup: boolean
  groupId?: string
  group?: SheetGroup
  rowId?: string
  row?: PriceRow
}
