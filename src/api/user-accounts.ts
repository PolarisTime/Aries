import { assertApiSuccess, http } from './client'
import type { ApiResponse, TotpSetupResponse } from '@/types/auth'
import type {
  DepartmentOptionRecord,
  RoleOptionRecord,
  UserAccountCreateResult,
  UserAccountFormPayload,
  UserAccountLoginNameAvailability,
  UserAccountRecord,
} from '@/types/user-account'

interface PageResponse<T> {
  records: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface UserAccountListParams {
  page: number
  size: number
  keyword?: string
  status?: string
}

export async function listUserAccounts(params: UserAccountListParams) {
  const response = await http.get<ApiResponse<PageResponse<UserAccountRecord>>, ApiResponse<PageResponse<UserAccountRecord>>>(
    '/user-accounts',
    { params },
  )
  return assertApiSuccess(response, '加载用户失败').data
}

export async function getUserAccountDetail(id: string | number) {
  const response = await http.get<ApiResponse<UserAccountRecord>, ApiResponse<UserAccountRecord>>(
    `/user-accounts/${id}`,
  )
  return assertApiSuccess(response, '加载用户详情失败').data
}

export async function checkUserAccountLoginName(loginName: string, excludeUserId?: string | number) {
  const response = await http.get<ApiResponse<UserAccountLoginNameAvailability>, ApiResponse<UserAccountLoginNameAvailability>>(
    '/user-accounts/login-name-availability',
    {
      params: {
        loginName,
        excludeUserId,
      },
    },
  )
  return assertApiSuccess(response, '检查登录账号失败').data
}

export async function createUserAccount(payload: UserAccountFormPayload) {
  const response = await http.post<ApiResponse<UserAccountCreateResult>, ApiResponse<UserAccountCreateResult>>(
    '/user-accounts',
    payload,
  )
  return assertApiSuccess(response, '创建用户失败')
}

export async function updateUserAccount(id: string | number, payload: UserAccountFormPayload) {
  const response = await http.put<ApiResponse<UserAccountRecord>, ApiResponse<UserAccountRecord>>(
    `/user-accounts/${id}`,
    payload,
  )
  return assertApiSuccess(response, '保存用户失败')
}

export async function deleteUserAccount(id: string | number) {
  const response = await http.delete<ApiResponse<null>, ApiResponse<null>>(`/user-accounts/${id}`)
  return assertApiSuccess(response, '删除用户失败')
}

export async function setupUserAccount2fa(id: string | number) {
  const response = await http.post<ApiResponse<TotpSetupResponse>, ApiResponse<TotpSetupResponse>>(
    `/user-accounts/${id}/2fa/setup`,
  )
  return assertApiSuccess(response, '生成 2FA 二维码失败')
}

export async function enableUserAccount2fa(id: string | number, totpCode: string) {
  const response = await http.post<ApiResponse<UserAccountRecord>, ApiResponse<UserAccountRecord>>(
    `/user-accounts/${id}/2fa/enable`,
    { totpCode },
  )
  return assertApiSuccess(response, '启用 2FA 失败')
}

export async function disableUserAccount2fa(id: string | number) {
  const response = await http.post<ApiResponse<UserAccountRecord>, ApiResponse<UserAccountRecord>>(
    `/user-accounts/${id}/2fa/disable`,
  )
  return assertApiSuccess(response, '停用 2FA 失败')
}

export async function listRoleOptions() {
  const response = await http.get<ApiResponse<PageResponse<RoleOptionRecord>>, ApiResponse<PageResponse<RoleOptionRecord>>>(
    '/role-settings',
    {
      params: {
        page: 0,
        size: 200,
      },
    },
  )
  return assertApiSuccess(response, '加载角色失败').data?.records || []
}

export async function listDepartmentOptions() {
  const response = await http.get<ApiResponse<DepartmentOptionRecord[]>, ApiResponse<DepartmentOptionRecord[]>>(
    '/departments/options',
  )
  return assertApiSuccess(response, '加载部门失败').data || []
}
