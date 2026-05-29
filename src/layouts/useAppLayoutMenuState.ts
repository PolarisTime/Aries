import { useEffect, useState } from 'react'
import type { MenuNode } from '@/api/system-menus'
import { isKnownAppIconKey } from '@/config/app-icons'
import {
  buildMenuEntriesByGroup,
  menuGroupDefinitions,
  menuGroupOrder,
} from '@/config/navigation-registry'
import {
  type AppPageDefinition,
  appPageDefinitions,
  getPageDefinition,
} from '@/config/page-registry'
import { buildVisibleLayoutMenuEntries } from '@/layouts/layout-menu'
import {
  buildMenuPathMap,
  buildSideMenuItems,
  buildTopMenuItems,
  findMenuParentKeys,
} from '@/layouts/layout-menu-items'
import {
  checkAccessResources,
  usePermissionStore,
} from '@/stores/permissionStore'

const menuEntriesByGroup = buildMenuEntriesByGroup(appPageDefinitions)

function resolveEntryAccess(entry: AppPageDefinition) {
  if (
    Array.isArray(entry.accessResources) &&
    entry.accessResources.length > 0
  ) {
    return checkAccessResources(
      entry.accessResources,
      usePermissionStore.getState().can,
    )
  }
  return usePermissionStore
    .getState()
    .can(entry.resourceKey || entry.key, 'read')
}

interface Options {
  activeMenuKey: string
  can: (resource: string, action: string) => boolean
  collapsed: boolean
  menus: MenuNode[]
}

export function useAppLayoutMenuState(options: Options) {
  const [siderOpenKeys, setSiderOpenKeys] = useState<string[]>([])

  const visibleMenuEntries = buildVisibleLayoutMenuEntries({
    appPageDefinitions,
    defaultIcon: 'AppstoreOutlined',
    getMenuEntriesByGroup: (groupKey) => menuEntriesByGroup.get(groupKey) || [],
    getPageDefinition,
    isKnownIconKey: isKnownAppIconKey,
    menuGroupDefinitions,
    menuGroupOrder,
    systemMenuTree: options.menus,
    userCanAccessEntry: (entry) => resolveEntryAccess(entry),
    userCanAccessMenuCode: (resourceCode, menuCode) =>
      options.can(resourceCode || menuCode, 'read'),
  })

  const menuPathByKey = buildMenuPathMap(visibleMenuEntries)

  const selectedKeys = [options.activeMenuKey]

  const resolvedSiderOpenKeys =
    findMenuParentKeys(visibleMenuEntries, options.activeMenuKey) || []

  useEffect(() => {
    if (options.collapsed) {
      setSiderOpenKeys([])
      return
    }
    setSiderOpenKeys(resolvedSiderOpenKeys)
  }, [options.collapsed, resolvedSiderOpenKeys])

  const sideMenuItems = buildSideMenuItems(visibleMenuEntries)

  const topMenuItems = buildTopMenuItems(visibleMenuEntries)

  const resolveMenuPath = (key: string) => menuPathByKey[key]

  return {
    resolvedSiderOpenKeys,
    sideMenuItems,
    siderOpenKeys,
    selectedKeys,
    setSiderOpenKeys,
    topMenuItems,
    visibleMenuEntries,
    resolveMenuPath,
  }
}
