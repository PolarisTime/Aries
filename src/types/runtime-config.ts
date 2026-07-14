export interface RuntimeWatermarkConfig {
  enabled: boolean
  content: string
  fontSize: number
  color: string
  rotate: number
  density: number
}

export interface RuntimeUiConfig {
  defaultPageSize: number
  showSnowflakeId: boolean
  watermark: RuntimeWatermarkConfig
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
