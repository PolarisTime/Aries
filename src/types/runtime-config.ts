export interface RuntimeUiConfig {
  defaultPageSize: number
  showSnowflakeId: boolean
}

export interface RuntimeStatementConfig {
  customerReceiptAmountZero: boolean
}

export interface RuntimeBusinessConfig {
  statement: RuntimeStatementConfig
  /** 西本(STEELX)支持的取价地区(城市中文名); 由后端 leo.market.steelx-quote.regions 动态下发。 */
  quoteRegions: string[]
}

export interface RuntimeFeatureConfig {
  weightOnlyPurchaseInbound: boolean
  weightOnlySalesOutbound: boolean
}

export interface RuntimeSetupConfig {
  setupRequired: boolean
  accountConfigured: boolean
}

export interface RuntimeConfigResponse {
  setup: RuntimeSetupConfig
  ui: RuntimeUiConfig
  business: RuntimeBusinessConfig
  features: RuntimeFeatureConfig
}
