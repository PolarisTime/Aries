import type { MenuNode } from '@/api/system-menus'
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
  defaultIcon: AppIconKey
  getMenuEntriesByGroup: (groupKey: MenuGroupKey) => AppPageDefinition[]
  getPageDefinition: (key: string) => AppPageDefinition | undefined
  isKnownIconKey: (iconKey: string | null | undefined) => iconKey is AppIconKey
  menuGroupDefinitions: Record<MenuGroupKey, MenuGroupDefinition>
  menuGroupOrder: MenuGroupKey[]
  systemMenuTree: MenuNode[]
}

function resolveEntryPath(entry: AppPageDefinition) {
  return entry.menuKey.startsWith('/') ? entry.menuKey : `/${entry.menuKey}`
}

function resolveMenuPath(rawPath: string | null | undefined) {
  if (!rawPath) {
    return null
  }
  return rawPath.startsWith('/') ? rawPath : `/${rawPath}`
}

function buildStaticFallbackMenuTree(
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

function buildLayoutMenuEntry(
  node: MenuNode,
  options: BuildLayoutMenuOptions,
): LayoutMenuEntry | null {
  const matchedPage = options.getPageDefinition(node.menuCode)
  const children = (node.children || [])
    .map((child) => buildLayoutMenuEntry(child, options))
    .filter((child): child is LayoutMenuEntry => child != null)

  const canShowCurrent = matchedPage ? !matchedPage.hiddenInMenu : true

  if (!canShowCurrent && children.length === 0) {
    return null
  }

  return {
    menuCode: node.menuCode,
    title: node.menuName,
    path: resolveMenuPath(node.routePath),
    icon: options.isKnownIconKey(node.icon)
      ? node.icon
      : matchedPage?.icon || options.defaultIcon,
    children,
  }
}

function menuTreeContainsPath(nodes: LayoutMenuEntry[], path: string): boolean {
  return nodes.some(
    (node) => node.path === path || menuTreeContainsPath(node.children, path),
  )
}

function appendMissingPageEntries(
  nodes: LayoutMenuEntry[],
  options: BuildLayoutMenuOptions,
) {
  const nextNodes = nodes.map((node) => ({
    ...node,
    children: [...node.children],
  }))

  const aliasEntries = options.appPageDefinitions.filter(
    (entry) => !entry.hiddenInMenu,
  )

  aliasEntries.forEach((entry) => {
    const path = resolveEntryPath(entry)
    if (menuTreeContainsPath(nextNodes, path)) {
      return
    }

    const aliasNode: LayoutMenuEntry = {
      menuCode: entry.key,
      title: entry.title,
      path,
      icon: entry.icon,
      children: [],
    }

    const parentKey = entry.menuParent
    if (!parentKey) {
      nextNodes.push(aliasNode)
      return
    }

    const parentNode = nextNodes.find((node) => node.menuCode === parentKey)
    if (parentNode) {
      parentNode.children.push(aliasNode)
      return
    }

    nextNodes.push(aliasNode)
  })

  return nextNodes
}

export function buildVisibleLayoutMenuEntries(options: BuildLayoutMenuOptions) {
  if (options.systemMenuTree.length === 0) {
    return buildStaticFallbackMenuTree(options)
  }

  return appendMissingPageEntries(
    options.systemMenuTree
      .map((node) => buildLayoutMenuEntry(node, options))
      .filter((node): node is LayoutMenuEntry => node != null),
    options,
  )
}
