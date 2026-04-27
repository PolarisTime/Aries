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
  master: { key: 'master', title: '主数据管理', icon: 'AppstoreOutlined' },
  purchase: {
    key: 'purchase',
    title: '采购管理',
    icon: 'ShoppingCartOutlined',
  },
  sales: { key: 'sales', title: '销售管理', icon: 'ShopOutlined' },
  freight: { key: 'freight', title: '物流管理', icon: 'CarOutlined' },
  contracts: { key: 'contracts', title: '合同管理', icon: 'FileTextOutlined' },
  reports: { key: 'reports', title: '报表中心', icon: 'TableOutlined' },
  statements: {
    key: 'statements',
    title: '对账管理',
    icon: 'FileTextOutlined',
  },
  finance: { key: 'finance', title: '财务管理', icon: 'WalletOutlined' },
  system: { key: 'system', title: '系统设置', icon: 'PrinterOutlined' },
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
