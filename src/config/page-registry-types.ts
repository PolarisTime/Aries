import type {
  AppIconKey,
  MenuGroupKey,
} from '@/config/navigation-registry-types'
import type { ModuleKey } from '@/module-system/module-key'

export type RouteViewKey =
  | 'dashboard'
  | 'business-grid'
  | 'company-setting'
  | 'print-template'
  | 'account'
  | 'finance-overview'
  | 'cash-ledger'

export interface AppPageDefinition {
  key: string
  title: string
  menuKey: string
  view: RouteViewKey
  icon: AppIconKey
  menuParent?: MenuGroupKey
  moduleKey?: ModuleKey
  searchable?: boolean
  hiddenInMenu?: boolean
  activeMenuKey?: string
  openPageKey?: string
}
