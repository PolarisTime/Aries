export interface RuntimeUiConfig {
  defaultPageSize: number
  showSnowflakeId: boolean
}

export interface RuntimeStatementConfig {
  customerReceiptAmountZero: boolean
}

export interface RuntimeBusinessConfig {
  statement: RuntimeStatementConfig
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
