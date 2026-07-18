import { useState } from 'react'
import type { MenuNode } from '@/api/system-menus'
import { isKnownAppIconKey } from '@/config/app-icons'
import {
  buildMenuEntriesByGroup,
  menuGroupDefinitions,
  menuGroupOrder,
} from '@/config/navigation-registry'
import { appPageDefinitions, getPageDefinition } from '@/config/page-registry'
import { buildVisibleLayoutMenuEntries } from '@/layouts/layout-menu'
import {
  buildMenuPathMap,
  buildSideMenuItems,
  buildTopMenuItems,
  findMenuParentKeys,
} from '@/layouts/layout-menu-items'

const menuEntriesByGroup = buildMenuEntriesByGroup(appPageDefinitions)

interface Options {
  activeMenuKey: string
  collapsed: boolean
  menus: MenuNode[]
}

export function useAppLayoutMenuState(options: Options) {
  const [manualSiderOpenKeys, setManualSiderOpenKeys] = useState<string[]>([])
  const visibleMenuEntries = buildVisibleLayoutMenuEntries({
    appPageDefinitions,
    defaultIcon: 'AppstoreOutlined',
    getMenuEntriesByGroup: (groupKey) => menuEntriesByGroup.get(groupKey) || [],
    getPageDefinition,
    isKnownIconKey: isKnownAppIconKey,
    menuGroupDefinitions,
    menuGroupOrder,
    systemMenuTree: options.menus,
  })

  const menuPathByKey = buildMenuPathMap(visibleMenuEntries)

  const selectedKeys = [options.activeMenuKey]

  const resolvedSiderOpenKeys =
    findMenuParentKeys(visibleMenuEntries, options.activeMenuKey) || []
  const mergedSiderOpenKeys = Array.from(
    new Set([...resolvedSiderOpenKeys, ...manualSiderOpenKeys]),
  )

  const sideMenuItems = buildSideMenuItems(visibleMenuEntries)

  const topMenuItems = buildTopMenuItems(visibleMenuEntries)

  const resolveMenuPath = (key: string) => menuPathByKey[key]

  return {
    resolvedSiderOpenKeys,
    sideMenuItems,
    siderOpenKeys: options.collapsed ? [] : mergedSiderOpenKeys,
    selectedKeys,
    setSiderOpenKeys: setManualSiderOpenKeys,
    topMenuItems,
    visibleMenuEntries,
    resolveMenuPath,
  }
}
