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
  'master-carrier': () =>
    import('@/views/master-archive/CarrierPage').then((m) => ({
      default: m.CarrierPage,
    })),
  'master-material': () =>
    import('@/views/master-data/MaterialPage').then((m) => ({
      default: m.MaterialPage,
    })),
  'master-material-categories': () =>
    import('@/views/master-data/MaterialCategoriesPage').then((m) => ({
      default: m.MaterialCategoriesPage,
    })),
  'master-supplier': () =>
    import('@/views/master-data/SupplierPage').then((m) => ({
      default: m.SupplierPage,
    })),
  'master-customer': () =>
    import('@/views/master-data/CustomerPage').then((m) => ({
      default: m.CustomerPage,
    })),
  'master-warehouse': () =>
    import('@/views/master-data/WarehousePage').then((m) => ({
      default: m.WarehousePage,
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
  'print-template': () =>
    import('@/views/system/PrintTemplateView').then((m) => ({
      default: m.PrintTemplateView,
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
}
