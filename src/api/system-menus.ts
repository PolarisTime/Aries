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

export async function listSystemMenus() {
  const response = assertApiSuccess(
    await http.get<MenuResponse<MenuNode[]>>(ENDPOINTS.SYSTEM_MENUS_TREE),
    '加载菜单失败',
  )
  return response.data || []
}
