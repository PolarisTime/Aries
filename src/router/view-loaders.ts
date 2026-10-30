import type { ComponentType } from 'react'
import type { RouteViewKey } from '@/config/page-registry'

/**
 * 视图 key → 懒加载组件工厂。
 * 与 `RouteViewKey` 同源维系的唯一映射：新增视图时必须在此登记，
 * 并由 `view-loaders.spec.ts` 守卫，避免 `page-registry` 与路由映射漂移。
 */
export const viewLoaders: Record<
  RouteViewKey,
  () => Promise<{ default: ComponentType }>
> = {
  dashboard: () =>
    import('@/views/dashboard/LazyDashboardView').then((m) => ({
      default: m.LazyDashboardView,
    })),
  'business-grid': () =>
    import('@/views/modules/BusinessGridView').then((m) => ({
      default: m.BusinessGridView,
    })),
  'master-project': () =>
    import('@/views/master-archive/ProjectPage').then((m) => ({
      default: m.ProjectPage,
    })),
  'master-supplier': () =>
    import('@/views/master-data/SupplierPage').then((m) => ({
      default: m.SupplierPage,
    })),
  'master-value-alias': () =>
    import('@/views/master-data/ValueAliasPage').then((m) => ({
      default: m.ValueAliasPage,
    })),
  'master-quote-region': () =>
    import('@/views/master-data/QuoteRegionPage').then((m) => ({
      default: m.QuoteRegionPage,
    })),
  'master-length-premium': () =>
    import('@/views/master-data/LengthPremiumPage').then((m) => ({
      default: m.LengthPremiumPage,
    })),
  'supplier-quote': () =>
    import('@/views/price-compare/SupplierQuotePage').then((m) => ({
      default: m.SupplierQuotePage,
    })),
  'sales-contract': () =>
    import('@/views/sales-contracts/SalesContractPage').then((m) => ({
      default: m.SalesContractPage,
    })),
  'price-compare': () =>
    import('@/views/price-compare/PriceCompareView').then((m) => ({
      default: m.PriceCompareView,
    })),
  'market-sync': () =>
    import('@/views/market/MarketSyncView').then((m) => ({
      default: m.MarketSyncView,
    })),
  'company-setting': () =>
    import('@/views/system/CompanySettingsView').then((m) => ({
      default: m.CompanySettingsView,
    })),
  'operation-log': () =>
    import('@/views/system/OperationLogPage').then((m) => ({
      default: m.OperationLogPage,
    })),
  'print-template': () =>
    import('@/views/system/PrintTemplateView').then((m) => ({
      default: m.PrintTemplateView,
    })),
  'role-management': () =>
    import('@/views/system/RoleManagementView').then((m) => ({
      default: m.RoleManagementView,
    })),
  'user-accounts': () =>
    import('@/views/system/UserAccountManagementView').then((m) => ({
      default: m.UserAccountManagementView,
    })),
  account: () =>
    import('@/views/system/AccountView').then((m) => ({
      default: m.AccountView,
    })),
  'finance-overview': () =>
    import('@/views/finance/FinanceOverviewView').then((m) => ({
      default: m.FinanceOverviewView,
    })),
  'cash-ledger': () =>
    import('@/views/finance/CashLedgerView').then((m) => ({
      default: m.CashLedgerView,
    })),
  inventory: () =>
    import('@/views/inventory/InventoryView').then((m) => ({
      default: m.InventoryView,
    })),
}

/**
 * 已发起过预取的视图 key（幂等标记）。
 *
 * <p>只记 key、不存 Promise：`viewLoaders[key]()` 本身由打包器缓存模块，重复调用不会重复下载；
 * 这里只避免对同一个 key 反复触发无谓的函数调用。</p>
 */
const preloadedViews = new Set<RouteViewKey>()

/**
 * 预取某个页面视图的 chunk —— **意图触发**（悬停/聚焦菜单项、悬停标签页）。
 *
 * <p>为什么需要它：标签面板的内容是 `lazy(viewLoaders[view])`，首次点开一个还没挂载过的标签
 * 必须现下载 chunk（实测 dev 下 200~300ms），这段时间内容区只能给骨架。用户要的是「点开即见内容」，
 * 唯一可行做法是**在点击之前**把 chunk 拿到 —— 也就是复用 `defaultPreload: 'intent'` 的思路，
 * 把"意图"从路由层延伸到视图 chunk。</p>
 *
 * <p>失败时静默并清掉标记（后续点击会重新走正常加载路径），预取失败绝不能影响功能。</p>
 */
export function preloadView(view: RouteViewKey): void {
  if (preloadedViews.has(view)) {
    return
  }
  preloadedViews.add(view)
  void viewLoaders[view]().catch(() => {
    preloadedViews.delete(view)
  })
}
