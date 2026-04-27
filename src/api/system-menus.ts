import { assertApiSuccess, http } from '@/api/client'

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
    (await http.get('/system/menus/tree')) as unknown as MenuResponse<
      MenuNode[]
    >,
    '加载菜单失败',
  )
  return response.data || []
}
