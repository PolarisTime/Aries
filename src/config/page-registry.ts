import { dashboardPageDefinitions } from '@/config/page-registry-dashboard'
import { financePageDefinitions } from '@/config/page-registry-finance'
import { masterPageDefinitions } from '@/config/page-registry-master'
import { operationPageDefinitions } from '@/config/page-registry-operations'
import { systemPageDefinitions } from '@/config/page-registry-system'
import type { AppPageDefinition } from '@/config/page-registry-types'
import { MODULE_KEYS, type ModuleKey } from '@/module-system/core/module-key'
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

function assertCompleteModulePages(definitions: AppPageDefinition[]): void {
  const pageByModule = new Map<ModuleKey, AppPageDefinition>()
  for (const definition of definitions) {
    if (!definition.moduleKey) {
      continue
    }
    if (pageByModule.has(definition.moduleKey)) {
      throw new Error(`模块页面定义重复: ${definition.moduleKey}`)
    }
    pageByModule.set(definition.moduleKey, definition)
  }
  for (const moduleKey of MODULE_KEYS) {
    if (!pageByModule.has(moduleKey)) {
      throw new Error(`模块页面定义缺失: ${moduleKey}`)
    }
  }
}

assertCompleteModulePages(appPageDefinitions)

const appPageDefinitionMap = new Map<string, AppPageDefinition>()
function registerPageAlias(alias: string, entry: AppPageDefinition): void {
  const existingEntry = appPageDefinitionMap.get(alias)
  if (existingEntry && existingEntry !== entry) {
    throw new Error(
      `页面别名冲突: ${alias} 同时属于页面 ${existingEntry.key} 和 ${entry.key}`,
    )
  }
  appPageDefinitionMap.set(alias, entry)
}

for (const entry of appPageDefinitions) {
  for (const alias of new Set([entry.key, entry.menuKey])) {
    registerPageAlias(alias, entry)
  }
}
const searchableModuleKeys = appPageDefinitions.flatMap((entry) =>
  entry.searchable && entry.moduleKey ? [entry.moduleKey] : [],
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
