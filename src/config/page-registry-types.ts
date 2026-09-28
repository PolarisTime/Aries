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
  | 'master-supplier-price-list'
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
  /**
   * 页面标题的 i18n key(如 `pages.freight-bill`)。
   *
   * <p>这里必须存 key 而非已翻译文案：注册表属于 eager 加载模块，在模块顶层调用
   * `i18next.t()` 会早于 i18n 初始化求值（生产构建中两者被拆进不同 chunk，执行顺序
   * 不再由 main.tsx 的 import 顺序决定），得到 undefined 标题。请在渲染期
   * 用 `t(titleKey)` 解析。</p>
   */
  titleKey: string
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
