import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  buildMenuEntriesByGroup,
  menuGroupDefinitions,
  menuGroupOrder,
} from '@/config/navigation-registry'
import { appPageDefinitions } from '@/config/page-registry'
import { usePermissions } from '@/hooks/usePermission'
import { buildVisibleLayoutMenuEntries } from '@/layouts/layout-menu'
import {
  buildMenuPathMap,
  buildSideMenuItems,
  buildTopMenuItems,
  findMenuParentKeys,
} from '@/layouts/layout-menu-items'
import { hasPermission } from '@/utils/permission'

const menuEntriesByGroup = buildMenuEntriesByGroup(appPageDefinitions)

interface Options {
  activeMenuKey: string
  collapsed: boolean
}

export function useAppLayoutMenuState(options: Options) {
  const { t } = useTranslation()
  const [manualSiderOpenKeys, setManualSiderOpenKeys] = useState<string[]>([])
  const permissions = usePermissions()
  const visibleMenuEntries = buildVisibleLayoutMenuEntries({
    appPageDefinitions,
    getMenuEntriesByGroup: (groupKey) => menuEntriesByGroup.get(groupKey) || [],
    menuGroupDefinitions,
    menuGroupOrder,
    canAccessPage: (entry) =>
      hasPermission(permissions, entry.requiredPermission),
  })

  const menuPathByKey = buildMenuPathMap(visibleMenuEntries)

  const selectedKeys = [options.activeMenuKey]

  const resolvedSiderOpenKeys =
    findMenuParentKeys(visibleMenuEntries, options.activeMenuKey) || []
  const mergedSiderOpenKeys = Array.from(
    new Set([...resolvedSiderOpenKeys, ...manualSiderOpenKeys]),
  )

  const sideMenuItems = buildSideMenuItems(visibleMenuEntries, t)

  const topMenuItems = buildTopMenuItems(visibleMenuEntries, t)

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
