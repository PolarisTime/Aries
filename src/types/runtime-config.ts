export interface RuntimeUiConfig {
  defaultPageSize: number
  showSnowflakeId: boolean
}

export interface RuntimeStatementConfig {
  customerReceiptAmountZero: boolean
}

export interface RuntimeBusinessNoConfig {
  useSnowflakeId: boolean
}

export interface RuntimeBusinessConfig {
  defaultTaxRate: number
  statement: RuntimeStatementConfig
  businessNo: RuntimeBusinessNoConfig
}

export interface RuntimeFeatureConfig {
  weightOnlyPurchaseInbound: boolean
  weightOnlySalesOutbound: boolean
}

export interface RuntimeConfigResponse {
  ui: RuntimeUiConfig
  business: RuntimeBusinessConfig
  features: RuntimeFeatureConfig
}
