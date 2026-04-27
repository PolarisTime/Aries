import { assertApiSuccess, http } from '@/api/client'
import type { MenuNode } from '@/api/system-menus'

export type { MenuNode } from '@/api/system-menus'

export interface RoleRecord {
  id: string
  roleCode: string
  roleName: string
  roleType: string
  dataScope: string
  status: string
  userCount: number
  remark: string | null
}

export interface RolePermissionRecord {
  resource: string
  action: string
}

interface RoleResponse<T> {
  code: number
  message?: string
  data: T
}

interface RolePageData {
  records: RoleRecord[]
  totalPages?: number
}

export async function listSystemMenus() {
  const response = assertApiSuccess(
    (await http.get('/role-settings/permission-options')) as unknown as RoleResponse<MenuNode[]>,
    '加载权限选项失败',
  )
  return response.data || []
}

export async function listRoleSettingsPage(page: number, size: number) {
  const response = assertApiSuccess(
    (await http.get('/role-settings', {
      params: { page, size },
    })) as unknown as RoleResponse<RolePageData>,
    '加载角色失败',
  )
  return response.data
}

export async function getRoleActions(id: string | number) {
  const response = assertApiSuccess(
    (await http.get(`/role-settings/${id}/permissions`)) as unknown as RoleResponse<
      RolePermissionRecord[]
    >,
    '加载角色权限失败',
  )
  return response.data || []
}

export async function updateRoleActions(
  id: string | number,
  actions: RolePermissionRecord[],
) {
  return assertApiSuccess(
    (await http.put(
      `/role-settings/${id}/permissions`,
      actions,
    )) as unknown as RoleResponse<null>,
    '保存角色权限失败',
  )
}

export async function updateRole(
  id: string | number,
  payload: Record<string, unknown>,
) {
  return assertApiSuccess(
    (await http.put(
      `/role-settings/${id}`,
      payload,
    )) as unknown as RoleResponse<null>,
    '更新角色失败',
  )
}

export async function createRole(payload: Record<string, unknown>) {
  return assertApiSuccess(
    (await http.post(
      '/role-settings',
      payload,
    )) as unknown as RoleResponse<RoleRecord>,
    '创建角色失败',
  )
}
