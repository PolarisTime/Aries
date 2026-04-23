export interface MaterialCategoryNode {
  id: number
  key?: number
  value?: number
  title: string
  children?: MaterialCategoryNode[]
}

export interface MaterialRecord {
  id: number
  mBarCode?: string
  name?: string
  model?: string
  standard?: string
  color?: string
  brand?: string
  categoryName?: string
  unit?: string
  unitName?: string
  stock?: number | string
  purchaseDecimal?: number | string
  commodityDecimal?: number | string
  wholesaleDecimal?: number | string
  enabled?: string | number | boolean
  remark?: string
}

export interface MaterialListSearch {
  categoryId?: number
  materialParam?: string
  model?: string
  standard?: string
  enabled?: string
}
