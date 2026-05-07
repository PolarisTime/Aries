import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { MenuNode } from '@/api/system-menus'
export type { MenuNode } from '@/api/system-menus'

export interface RoleRecord {
  id: string; roleCode: string; roleName: string; roleType: string
  dataScope: string; status: string; userCount: number; remark: string | null
}
export interface RolePermissionRecord { resource: string; action: string }

interface RoleResponse<T> { code: number; message?: string; data: T }
interface RolePageData { records: RoleRecord[]; totalPages?: number }

export async function listSystemMenus() {
  const response = assertApiSuccess(
    await http.get<RoleResponse<MenuNode[]>>(ENDPOINTS.ROLE_PERMISSION_OPTIONS),
    '加载权限选项失败',
  )
  return response.data || []
}
export async function listRoleSettingsPage(page: number, size: number) {
  const response = assertApiSuccess(
    await http.get<RoleResponse<RolePageData>>(ENDPOINTS.ROLE_SETTINGS, { params: { page, size } }),
    '加载角色失败',
  )
  return response.data
}
export async function getRoleActions(id: string | number) {
  const response = assertApiSuccess(
    await http.get<RoleResponse<RolePermissionRecord[]>>(`${ENDPOINTS.ROLE_SETTINGS}/${id}/permissions`),
    '加载角色权限失败',
  )
  return response.data || []
}
export async function updateRoleActions(id: string | number, actions: RolePermissionRecord[]) {
  return assertApiSuccess(
    await http.put<RoleResponse<null>>(`${ENDPOINTS.ROLE_SETTINGS}/${id}/permissions`, actions),
    '保存角色权限失败',
  )
}
export async function updateRole(id: string | number, payload: Record<string, unknown>) {
  return assertApiSuccess(
    await http.put<RoleResponse<null>>(`${ENDPOINTS.ROLE_SETTINGS}/${id}`, payload),
    '更新角色失败',
  )
}
export async function createRole(payload: Record<string, unknown>) {
  return assertApiSuccess(
    await http.post<RoleResponse<RoleRecord>>(ENDPOINTS.ROLE_SETTINGS, payload),
    '创建角色失败',
  )
}

export async function deleteRole(id: string | number) {
  return assertApiSuccess(
    await http.delete<RoleResponse<null>>(`${ENDPOINTS.ROLE_SETTINGS}/${id}`),
    '删除角色失败',
  )
}
