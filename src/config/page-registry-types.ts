import type { AppIconKey, MenuGroupKey } from '@/config/navigation-registry'

export type RouteViewKey =
  | 'dashboard'
  | 'business-grid'
  | 'system-parameters'
  | 'general-setting'
  | 'company-setting'
  | 'print-template'
  | 'user-account'
  | 'cash-ledger'

export interface AppPageDefinition {
  key: string
  title: string
  menuKey: string
  view: RouteViewKey
  icon: AppIconKey
  menuParent?: MenuGroupKey
  moduleKey?: string
  searchable?: boolean
  hiddenInMenu?: boolean
  activeMenuKey?: string
  openPageKey?: string
}
