export interface SupplierOption {
  id: number
  supplier: string
}

export interface PurchaseOrderRecord {
  id: number
  organId?: number
  organName?: string
  projectName?: string
  number?: string
  linkApply?: string
  linkNumber?: string
  materialsList?: string
  operTimeStr?: string
  userName?: string
  materialCount?: number | string
  totalPrice?: number | string
  totalTaxLastMoney?: number | string
  changeAmount?: number | string
  status?: string | number
  totalWeight?: number | string
  remark?: string
}

export interface PurchaseOrderSearch {
  type: string
  subType: string
  number?: string
  materialParam?: string
  organId?: number
  status?: string
}
