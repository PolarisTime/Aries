import type {
  MenuGroupDefinition,
  MenuGroupKey,
} from '@/config/navigation-registry-types'
import type { AppPageDefinition } from '@/config/page-registry-types'

export type {
  AppIconKey,
  MenuGroupDefinition,
  MenuGroupKey,
} from '@/config/navigation-registry-types'

export const menuGroupOrder: MenuGroupKey[] = [
  'master',
  'market',
  'purchase',
  'sales',
  'inventory',
  'freight',
  'statements',
  'finance',
  'system',
]

export const menuGroupDefinitions: Record<MenuGroupKey, MenuGroupDefinition> = {
  master: {
    key: 'master',
    titleKey: 'navigation.master',
    icon: 'AppstoreOutlined',
  },
  market: {
    key: 'market',
    titleKey: 'navigation.market',
    icon: 'CalculatorOutlined',
  },
  purchase: {
    key: 'purchase',
    titleKey: 'navigation.purchase',
    icon: 'ShoppingCartOutlined',
  },
  sales: {
    key: 'sales',
    titleKey: 'navigation.sales',
    icon: 'ShopOutlined',
  },
  inventory: {
    key: 'inventory',
    titleKey: 'navigation.inventory',
    icon: 'DatabaseOutlined',
  },
  freight: {
    key: 'freight',
    titleKey: 'navigation.freight',
    icon: 'CarOutlined',
  },
  statements: {
    key: 'statements',
    titleKey: 'navigation.statements',
    icon: 'FileTextOutlined',
  },
  finance: {
    key: 'finance',
    titleKey: 'navigation.finance',
    icon: 'WalletOutlined',
  },
  system: {
    key: 'system',
    titleKey: 'navigation.system',
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
