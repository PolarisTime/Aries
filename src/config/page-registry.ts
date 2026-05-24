import { dashboardPageDefinitions } from '@/config/page-registry-dashboard'
import { financePageDefinitions } from '@/config/page-registry-finance'
import { masterPageDefinitions } from '@/config/page-registry-master'
import { operationPageDefinitions } from '@/config/page-registry-operations'
import { systemPageDefinitions } from '@/config/page-registry-system'
import type { AppPageDefinition } from '@/config/page-registry-types'
import { asString } from '@/utils/type-narrowing'

export type {
  AppPageDefinition,
  RouteViewKey,
} from '@/config/page-registry-types'

export const appPageDefinitions: AppPageDefinition[] = [
  ...dashboardPageDefinitions,
  ...masterPageDefinitions,
  ...operationPageDefinitions,
  ...financePageDefinitions,
  ...systemPageDefinitions,
]

export const dashboardPageDefinition = dashboardPageDefinitions[0]

const appPageDefinitionMap = new Map<string, AppPageDefinition>()
for (const entry of appPageDefinitions) {
  appPageDefinitionMap.set(entry.key, entry)
  appPageDefinitionMap.set(entry.menuKey, entry)
}
const searchableModuleKeys = appPageDefinitions.flatMap((entry) =>
  entry.searchable && entry.moduleKey ? [asString(entry.moduleKey)] : [],
)

export function getPageRoutePath(page: AppPageDefinition | string) {
  const target =
    typeof page === 'string' ? appPageDefinitionMap.get(page) : page
  if (!target) {
    throw new Error(`未找到页面定义: ${asString(page)}`)
  }
  return target.menuKey.replace(/^\/+/, '')
}

export function getPageDefinition(key: string) {
  return appPageDefinitionMap.get(key)
}

export function getSearchableModuleKeys() {
  return searchableModuleKeys
}
