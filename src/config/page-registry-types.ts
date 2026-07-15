import type { AppIconKey, MenuGroupKey } from '@/config/navigation-registry'

export type RouteViewKey =
  | 'dashboard'
  | 'business-grid'
  | 'system-parameters'
  | 'number-rules'
  | 'general-setting'
  | 'company-setting'
  | 'print-template'
  | 'access-control'
  | 'security-center'
  | 'session'
  | 'api-key'
  | 'security-key'
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
  accessMenuKeys?: string[]
  hiddenInMenu?: boolean
  activeMenuKey?: string
  openPageKey?: string
  /** Explicit permission resource code. Takes priority over menuKey-based resolution. */
  resourceKey?: string
  /** Direct resource codes for page-level access check (replaces accessMenuKeys bridge). */
  accessResources?: string[]
}
