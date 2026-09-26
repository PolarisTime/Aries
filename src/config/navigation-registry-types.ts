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
  | 'UsergroupAddOutlined'
  | 'WalletOutlined'

export type MenuGroupKey =
  | 'master'
  | 'market'
  | 'purchase'
  | 'sales'
  | 'inventory'
  | 'freight'
  | 'statements'
  | 'finance'
  | 'system'

export interface MenuGroupDefinition {
  key: MenuGroupKey
  /** 菜单分组标题的 i18n key(如 `navigation.master`)；渲染期用 `t(titleKey)` 解析。 */
  titleKey: string
  icon: AppIconKey
}
