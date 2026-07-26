export type AppIconKey =
  | 'AccountBookOutlined'
  | 'HomeOutlined'
  | 'AppstoreOutlined'
  | 'BankOutlined'
  | 'CalculatorOutlined'
  | 'CarOutlined'
  | 'CreditCardOutlined'
  | 'DatabaseOutlined'
  | 'FileDoneOutlined'
  | 'FileSearchOutlined'
  | 'FileSyncOutlined'
  | 'FileTextOutlined'
  | 'InboxOutlined'
  | 'PrinterOutlined'
  | 'ProfileOutlined'
  | 'RollbackOutlined'
  | 'SettingOutlined'
  | 'ShopOutlined'
  | 'ShoppingCartOutlined'
  | 'SwapOutlined'
  | 'TagsOutlined'
  | 'TeamOutlined'
  | 'UserOutlined'
  | 'WalletOutlined'

export type MenuGroupKey =
  | 'master'
  | 'purchase'
  | 'sales'
  | 'freight'
  | 'statements'
  | 'finance'
  | 'system'

export interface MenuGroupDefinition {
  key: MenuGroupKey
  title: string
  icon: AppIconKey
}
