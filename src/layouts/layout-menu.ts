import type {
  AppIconKey,
  MenuGroupDefinition,
  MenuGroupKey,
} from '@/config/navigation-registry'
import type { AppPageDefinition } from '@/config/page-registry'

export interface LayoutMenuEntry {
  menuCode: string
  title: string
  path: string | null
  icon: AppIconKey
  children: LayoutMenuEntry[]
}

interface BuildLayoutMenuOptions {
  appPageDefinitions: AppPageDefinition[]
  getMenuEntriesByGroup: (groupKey: MenuGroupKey) => AppPageDefinition[]
  menuGroupDefinitions: Record<MenuGroupKey, MenuGroupDefinition>
  menuGroupOrder: MenuGroupKey[]
}

function resolveEntryPath(entry: AppPageDefinition) {
  return entry.menuKey.startsWith('/') ? entry.menuKey : `/${entry.menuKey}`
}

export function buildVisibleLayoutMenuEntries(
  options: BuildLayoutMenuOptions,
): LayoutMenuEntry[] {
  const topLevelMenuEntries = options.appPageDefinitions.filter(
    (entry) => !entry.menuParent && !entry.hiddenInMenu,
  )
  const menuGroups = options.menuGroupOrder.flatMap((groupKey) => {
    const items = options
      .getMenuEntriesByGroup(groupKey)
      .filter((entry) => !entry.hiddenInMenu)
    return items.length > 0
      ? [{ ...options.menuGroupDefinitions[groupKey], items }]
      : []
  })

  return [
    ...topLevelMenuEntries.map<LayoutMenuEntry>((entry) => ({
      menuCode: entry.key,
      title: entry.title,
      path: resolveEntryPath(entry),
      icon: entry.icon,
      children: [],
    })),
    ...menuGroups.map<LayoutMenuEntry>((group) => ({
      menuCode: group.key,
      title: group.title,
      path: null,
      icon: group.icon,
      children: group.items.map((entry) => ({
        menuCode: entry.key,
        title: entry.title,
        path: resolveEntryPath(entry),
        icon: entry.icon,
        children: [],
      })),
    })),
  ]
}
