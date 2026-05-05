import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'

export interface MenuNode {
  menuCode: string
  menuName: string
  parentCode: string | null
  routePath: string | null
  icon: string | null
  sortOrder: number
  menuType: string
  actions: string[]
  children: MenuNode[]
}

interface MenuResponse<T> {
  code: number
  message?: string
  data: T
}

interface RawMenuNode {
  menuCode?: string
  menuName?: string
  parentCode?: string | null
  routePath?: string | null
  icon?: string | null
  sortOrder?: number
  menuType?: string
  actions?: string[]
  children?: RawMenuNode[]
  code?: string
  title?: string
  parentId?: number | null
  path?: string | null
}

function normalizeMenuNode(node: RawMenuNode, parentCode: string | null = null): MenuNode {
  const menuCode = String(node.menuCode || node.code || '')
  return {
    menuCode,
    menuName: String(node.menuName || node.title || menuCode),
    parentCode: node.parentCode ?? parentCode,
    routePath: node.routePath ?? node.path ?? null,
    icon: node.icon ?? null,
    sortOrder: typeof node.sortOrder === 'number' ? node.sortOrder : 0,
    menuType: String(node.menuType || 'MENU'),
    actions: Array.isArray(node.actions) ? node.actions.map(String) : [],
    children: Array.isArray(node.children)
      ? node.children.map((child) => normalizeMenuNode(child, menuCode))
      : [],
  }
}

export async function listSystemMenus() {
  const response = assertApiSuccess(
    await http.get<MenuResponse<RawMenuNode[]>>(ENDPOINTS.SYSTEM_MENUS_TREE),
    '加载菜单失败',
  )
  return Array.isArray(response.data)
    ? response.data.map((node) => normalizeMenuNode(node))
    : []
}
