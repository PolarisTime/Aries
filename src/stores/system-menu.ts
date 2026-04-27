import { ref } from 'vue'
import { defineStore } from 'pinia'
import { listSystemMenus, type MenuNode } from '@/api/system-menus'
import { validateSystemMenuTree } from '@/config/system-menu-contract'

const REPORTED_MENU_ISSUES = new Set<string>()

export const useSystemMenuStore = defineStore('system-menu', () => {
  const menus = ref<MenuNode[]>([])
  const loaded = ref(false)
  let pendingLoad: Promise<MenuNode[]> | null = null

  function clearMenus() {
    menus.value = []
    loaded.value = false
    pendingLoad = null
    REPORTED_MENU_ISSUES.clear()
  }

  function reportContractIssues(nextMenus: MenuNode[]) {
    const issues = validateSystemMenuTree(nextMenus)
    issues.forEach((issue) => {
      const signature = `${issue.type}:${issue.menuCode}:${issue.message}`
      if (REPORTED_MENU_ISSUES.has(signature)) {
        return
      }
      REPORTED_MENU_ISSUES.add(signature)
      console.warn(`[system-menu] ${issue.message}`)
    })
  }

  async function loadMenus(force = false) {
    if (!force && loaded.value) {
      return menus.value
    }

    if (!force && pendingLoad) {
      return pendingLoad
    }

    pendingLoad = listSystemMenus()
      .then((nextMenus) => {
        reportContractIssues(nextMenus)
        menus.value = nextMenus
        loaded.value = true
        return menus.value
      })
      .finally(() => {
        pendingLoad = null
      })

    return pendingLoad
  }

  return {
    menus,
    loaded,
    loadMenus,
    clearMenus,
  }
})
