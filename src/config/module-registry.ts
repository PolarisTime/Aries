import {
  buildMenuEntriesByGroup,
  menuGroupDefinitions,
  menuGroupOrder,
} from '@/config/navigation-registry'
import {
  appPageDefinitions,
  dashboardPageDefinition,
  getPageDefinition,
  getPageRoutePath,
  getSearchableModuleKeys,
} from '@/config/page-registry'

export type {
  AppIconKey,
  MenuGroupDefinition,
  MenuGroupKey,
} from '@/config/navigation-registry'
export { buildMenuEntriesByGroup, menuGroupDefinitions, menuGroupOrder }
export type { AppPageDefinition, RouteViewKey } from '@/config/page-registry'
export {
  appPageDefinitions,
  dashboardPageDefinition,
  getPageDefinition,
  getPageRoutePath,
  getSearchableModuleKeys,
}

const menuEntriesByGroup = buildMenuEntriesByGroup(appPageDefinitions)

export function getMenuEntriesByGroup(
  groupKey: import('@/config/navigation-registry').MenuGroupKey,
) {
  return menuEntriesByGroup.get(groupKey) || []
}
