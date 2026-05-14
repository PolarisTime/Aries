import { useCallback, useEffect, useMemo, useState } from 'react'
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

  const visibleMenuEntries = useMemo(() => {
    return buildVisibleLayoutMenuEntries({
      appPageDefinitions,
      defaultIcon: 'AppstoreOutlined',
      getMenuEntriesByGroup: (groupKey) =>
        menuEntriesByGroup.get(groupKey) || [],
      getPageDefinition,
      isKnownIconKey: isKnownAppIconKey,
      menuGroupDefinitions,
      menuGroupOrder,
      systemMenuTree: options.menus,
      userCanAccessEntry: (entry) => resolveEntryAccess(entry),
      userCanAccessMenuCode: (resourceCode, menuCode) =>
        options.can(resourceCode || menuCode, 'read'),
    })
  }, [options.can, options.menus])

  const menuPathByKey = useMemo(
    () => buildMenuPathMap(visibleMenuEntries),
    [visibleMenuEntries],
  )

  const selectedKeys = useMemo(
    () => [options.activeMenuKey],
    [options.activeMenuKey],
  )

  const resolvedSiderOpenKeys = useMemo(
    () => findMenuParentKeys(visibleMenuEntries, options.activeMenuKey) || [],
    [options.activeMenuKey, visibleMenuEntries],
  )

  useEffect(() => {
    if (options.collapsed) {
      setSiderOpenKeys([])
      return
    }
    setSiderOpenKeys(resolvedSiderOpenKeys)
  }, [options.collapsed, resolvedSiderOpenKeys])

  const sideMenuItems = useMemo(
    () => buildSideMenuItems(visibleMenuEntries),
    [visibleMenuEntries],
  )

  const topMenuItems = useMemo(
    () => buildTopMenuItems(visibleMenuEntries),
    [visibleMenuEntries],
  )

  const resolveMenuPath = useCallback(
    (key: string) => menuPathByKey[key],
    [menuPathByKey],
  )

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
