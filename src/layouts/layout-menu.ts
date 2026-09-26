import type {
  AppIconKey,
  MenuGroupDefinition,
  MenuGroupKey,
} from '@/config/navigation-registry'
import type { AppPageDefinition } from '@/config/page-registry'

export interface LayoutMenuEntry {
  menuCode: string
  /** 菜单标题的 i18n key；由渲染层用 `t(titleKey)` 解析。 */
  titleKey: string
  path: string | null
  icon: AppIconKey
  children: LayoutMenuEntry[]
}

interface BuildLayoutMenuOptions {
  appPageDefinitions: AppPageDefinition[]
  getMenuEntriesByGroup: (groupKey: MenuGroupKey) => AppPageDefinition[]
  menuGroupDefinitions: Record<MenuGroupKey, MenuGroupDefinition>
  menuGroupOrder: MenuGroupKey[]
  /** 页面级访问判定: 返回 false 的页面不进入菜单(缺省全部可见)。 */
  canAccessPage?: (entry: AppPageDefinition) => boolean
}

function resolveEntryPath(entry: AppPageDefinition) {
  return entry.menuKey.startsWith('/') ? entry.menuKey : `/${entry.menuKey}`
}

export function buildVisibleLayoutMenuEntries(
  options: BuildLayoutMenuOptions,
): LayoutMenuEntry[] {
  const canAccessPage = options.canAccessPage ?? (() => true)
  const topLevelMenuEntries = options.appPageDefinitions.filter(
    (entry) => !entry.menuParent && !entry.hiddenInMenu && canAccessPage(entry),
  )
  const menuGroups = options.menuGroupOrder.flatMap((groupKey) => {
    const items = options
      .getMenuEntriesByGroup(groupKey)
      .filter((entry) => !entry.hiddenInMenu && canAccessPage(entry))
    return items.length > 0
      ? [{ ...options.menuGroupDefinitions[groupKey], items }]
      : []
  })

  return [
    ...topLevelMenuEntries.map<LayoutMenuEntry>((entry) => ({
      menuCode: entry.key,
      titleKey: entry.titleKey,
      path: resolveEntryPath(entry),
      icon: entry.icon,
      children: [],
    })),
    ...menuGroups.map<LayoutMenuEntry>((group) => ({
      menuCode: group.key,
      titleKey: group.titleKey,
      path: null,
      icon: group.icon,
      children: group.items.map((entry) => ({
        menuCode: entry.key,
        titleKey: entry.titleKey,
        path: resolveEntryPath(entry),
        icon: entry.icon,
        children: [],
      })),
    })),
  ]
}
