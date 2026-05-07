import type { AppPageDefinition } from '@/config/page-registry'

export type AppIconKey =
  | 'AccountBookOutlined'
  | 'ApartmentOutlined'
  | 'HomeOutlined'
  | 'AppstoreOutlined'
  | 'BarChartOutlined'
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
  | 'SafetyCertificateOutlined'
  | 'SettingOutlined'
  | 'ShopOutlined'
  | 'ShoppingCartOutlined'
  | 'SwapOutlined'
  | 'TableOutlined'
  | 'TagsOutlined'
  | 'TeamOutlined'
  | 'UserOutlined'
  | 'WalletOutlined'

export type MenuGroupKey =
  | 'master'
  | 'purchase'
  | 'sales'
  | 'freight'
  | 'contracts'
  | 'reports'
  | 'statements'
  | 'finance'
  | 'system'

export interface MenuGroupDefinition {
  key: MenuGroupKey
  title: string
  icon: AppIconKey
}

export const menuGroupOrder: MenuGroupKey[] = [
  'master',
  'purchase',
  'sales',
  'freight',
  'contracts',
  'reports',
  'statements',
  'finance',
  'system',
]

export const menuGroupDefinitions: Record<MenuGroupKey, MenuGroupDefinition> = {
  master: { key: 'master', title: '基础数据', icon: 'AppstoreOutlined' },
  purchase: {
    key: 'purchase',
    title: '采购',
    icon: 'ShoppingCartOutlined',
  },
  sales: { key: 'sales', title: '销售', icon: 'ShopOutlined' },
  freight: { key: 'freight', title: '物流', icon: 'CarOutlined' },
  contracts: { key: 'contracts', title: '合同', icon: 'FileTextOutlined' },
  reports: { key: 'reports', title: '报表', icon: 'TableOutlined' },
  statements: {
    key: 'statements',
    title: '对账',
    icon: 'FileTextOutlined',
  },
  finance: { key: 'finance', title: '财务', icon: 'WalletOutlined' },
  system: { key: 'system', title: '设置', icon: 'PrinterOutlined' },
}

export function buildMenuEntriesByGroup(
  appPageDefinitions: AppPageDefinition[],
) {
  return new Map<MenuGroupKey, AppPageDefinition[]>(
    menuGroupOrder.map((groupKey) => [
      groupKey,
      appPageDefinitions.filter(
        (entry) => entry.menuParent === groupKey && !entry.hiddenInMenu,
      ),
    ]),
  )
}
