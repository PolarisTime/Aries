import { computed, watch, type Ref } from 'vue'
import type { MenuNode } from '@/api/system-menus'
import {
  type AppIconKey,
  buildMenuEntriesByGroup,
  menuGroupDefinitions,
  menuGroupOrder,
} from '@/config/navigation-registry'
import {
  appPageDefinitions,
  type AppPageDefinition,
  getPageDefinition,
} from '@/config/page-registry'
import { buildVisibleLayoutMenuEntries } from '@/layouts/layout-menu'

interface PermissionSupport {
  canAccessMenuKey: (menuCode: string) => boolean
  syncFromAuth: () => void
}

interface SystemMenuSupport {
  clearMenus: () => void
  loadMenus: () => Promise<unknown>
}

interface UseLayoutMenuSupportOptions {
  user: Ref<unknown>
  systemMenuTree: Ref<MenuNode[]>
  permissionStore: PermissionSupport
  systemMenuStore: SystemMenuSupport
  isKnownIconKey: (iconKey: string | null | undefined) => iconKey is AppIconKey
}

const menuEntriesByGroup = buildMenuEntriesByGroup(appPageDefinitions)

function canAccessEntry(
  entry: AppPageDefinition,
  permissionStore: PermissionSupport,
) {
  if (Array.isArray(entry.accessMenuKeys) && entry.accessMenuKeys.length > 0) {
    return entry.accessMenuKeys.some((menuKey) =>
      permissionStore.canAccessMenuKey(menuKey),
    )
  }
  return permissionStore.canAccessMenuKey(entry.key)
}

export function useLayoutMenuSupport(options: UseLayoutMenuSupportOptions) {
  const visibleMenuEntries = computed(() => {
    return buildVisibleLayoutMenuEntries({
      appPageDefinitions,
      defaultIcon: 'AppstoreOutlined',
      getMenuEntriesByGroup: (groupKey) => menuEntriesByGroup.get(groupKey) || [],
      getPageDefinition,
      isKnownIconKey: options.isKnownIconKey,
      menuGroupDefinitions,
      menuGroupOrder,
      systemMenuTree: options.systemMenuTree.value,
      userCanAccessEntry: (entry) => canAccessEntry(entry, options.permissionStore),
      userCanAccessMenuCode: (menuCode) =>
        options.permissionStore.canAccessMenuKey(menuCode),
    })
  })

  async function loadVisibleMenus() {
    if (!options.user.value) {
      options.systemMenuStore.clearMenus()
      return
    }
    try {
      await options.systemMenuStore.loadMenus()
    } catch (error) {
      console.warn(
        '[app-layout] failed to load system menus, falling back to local registry',
        error,
      )
    }
  }

  watch(
    options.user,
    () => {
      options.permissionStore.syncFromAuth()
      void loadVisibleMenus()
    },
    { immediate: true, deep: true },
  )

  return {
    visibleMenuEntries,
    loadVisibleMenus,
  }
}
