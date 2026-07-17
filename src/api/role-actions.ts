import { assertApiSuccess, http } from '@/api/client'
import { pageContent } from '@/api/page-contract'
import type { MenuNode } from '@/api/system-menus'
import { ENDPOINTS } from '@/constants/endpoints'
import { getApiMessage } from '@/utils/api-messages'

export type { MenuNode } from '@/api/system-menus'

export interface RoleRecord {
  id: string
  roleCode: string
  roleName: string
  roleType: string
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
  content?: RoleRecord[]
  records?: RoleRecord[]
  totalPages?: number
}

export async function listSystemMenus() {
  const response = assertApiSuccess(
    await http.get<RoleResponse<MenuNode[]>>(ENDPOINTS.ROLE_PERMISSION_OPTIONS),
    getApiMessage('loadPermissionOptionsFailed'),
  )
  return response.data || []
}
export async function listRoleSettingsPage(page: number, size: number) {
  const response = assertApiSuccess(
    await http.get<RoleResponse<RolePageData>>(ENDPOINTS.ROLE_SETTINGS, {
      params: { page, size },
    }),
    getApiMessage('loadRolesFailed'),
  )
  return {
    ...response.data,
    records: pageContent(response.data),
  }
}
export async function getRoleActions(id: string) {
  const response = assertApiSuccess(
    await http.get<RoleResponse<RolePermissionRecord[]>>(
      `${ENDPOINTS.ROLE_SETTINGS}/${id}/permission`,
    ),
    getApiMessage('loadRolePermissionsFailed'),
  )
  return response.data || []
}
export async function updateRoleActions(
  id: string,
  actions: RolePermissionRecord[],
) {
  return assertApiSuccess(
    await http.put<RoleResponse<null>>(
      `${ENDPOINTS.ROLE_SETTINGS}/${id}/permission`,
      actions,
    ),
    getApiMessage('saveRolePermissionsFailed'),
  )
}
type RolePayload = {
  roleCode?: string
  roleName?: string
  roleType?: string
  status?: string
  remark?: string
}

export async function updateRole(id: string, payload: RolePayload) {
  return assertApiSuccess(
    await http.put<RoleResponse<null>>(
      `${ENDPOINTS.ROLE_SETTINGS}/${id}`,
      payload,
    ),
    getApiMessage('updateRoleFailed'),
  )
}
export async function createRole(payload: RolePayload) {
  return assertApiSuccess(
    await http.post<RoleResponse<RoleRecord>>(ENDPOINTS.ROLE_SETTINGS, payload),
    getApiMessage('createRoleFailed'),
  )
}

export async function deleteRole(id: string | number) {
  return assertApiSuccess(
    await http.delete<RoleResponse<null>>(`${ENDPOINTS.ROLE_SETTINGS}/${id}`),
    '删除角色失败',
  )
}
