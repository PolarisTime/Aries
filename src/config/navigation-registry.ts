import i18next from 'i18next'
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
  | 'RollbackOutlined'
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
  master: {
    key: 'master',
    title: i18next.t('navigation.master'),
    icon: 'AppstoreOutlined',
  },
  purchase: {
    key: 'purchase',
    title: i18next.t('navigation.purchase'),
    icon: 'ShoppingCartOutlined',
  },
  sales: {
    key: 'sales',
    title: i18next.t('navigation.sales'),
    icon: 'ShopOutlined',
  },
  freight: {
    key: 'freight',
    title: i18next.t('navigation.freight'),
    icon: 'CarOutlined',
  },
  contracts: {
    key: 'contracts',
    title: i18next.t('navigation.contracts'),
    icon: 'FileTextOutlined',
  },
  reports: {
    key: 'reports',
    title: i18next.t('navigation.reports'),
    icon: 'TableOutlined',
  },
  statements: {
    key: 'statements',
    title: i18next.t('navigation.statements'),
    icon: 'FileTextOutlined',
  },
  finance: {
    key: 'finance',
    title: i18next.t('navigation.finance'),
    icon: 'WalletOutlined',
  },
  system: {
    key: 'system',
    title: i18next.t('navigation.system'),
    icon: 'SettingOutlined',
  },
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
