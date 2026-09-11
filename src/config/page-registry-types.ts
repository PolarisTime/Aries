import type {
  AppIconKey,
  MenuGroupKey,
} from '@/config/navigation-registry-types'
import type { ModuleKey } from '@/module-system/core/module-key'

export type RouteViewKey =
  | 'dashboard'
  | 'business-grid'
  | 'master-project'
  | 'master-carrier'
  | 'master-material'
  | 'master-material-categories'
  | 'master-supplier'
  | 'master-customer'
  | 'master-warehouse'
  | 'price-compare'
  | 'market-sync'
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
}
