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
  | 'sales-contract'
  | 'price-compare'
  | 'market-sync'
  | 'company-setting'
  | 'print-template'
  | 'role-management'
  | 'user-accounts'
  | 'account'
  | 'finance-overview'
  | 'cash-ledger'
  | 'inventory'

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
  /** 访问该页面/菜单所需权限码；缺省表示所有登录用户可见。 */
  requiredPermission?: string
}
