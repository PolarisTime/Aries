import i18next from 'i18next'
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
  'purchase',
  'sales',
  'freight',
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
