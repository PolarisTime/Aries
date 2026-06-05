import { pageContent } from '@/api/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { TotpSetupResponse } from '@/types/auth'
import type {
  DepartmentOptionRecord,
  RoleOptionRecord,
  UserAccountCreateResult,
  UserAccountFormPayload,
  UserAccountLoginNameAvailability,
  UserAccountRecord,
} from '@/types/user-account'
import { getApiMessage } from '@/utils/api-messages'
import { assertApiSuccess, http } from './client'

interface PageResponse<T> {
  content?: T[]
  records?: T[]
  currentPage?: number
  page?: number
  pageSize?: number
  size?: number
  totalElements: number
  totalPages: number
  first?: boolean
  last?: boolean
}

export interface UserAccountListParams {
  page: number
  size: number
  keyword?: string
  status?: string
}

export function buildUserAccountUrl(id?: string) {
  return id != null
    ? `${ENDPOINTS.USER_ACCOUNTS}/${id}`
    : ENDPOINTS.USER_ACCOUNTS
}

export async function listUserAccounts(params: UserAccountListParams) {
  const response = await http.get<ApiResponse<PageResponse<UserAccountRecord>>>(
    ENDPOINTS.USER_ACCOUNTS,
    { params },
  )
  const data = assertApiSuccess(response, getApiMessage('loadUsersFailed')).data
  return { ...data, records: pageContent(data) }
}

export async function getUserAccountDetail(id: string) {
  const response = await http.get<ApiResponse<UserAccountRecord>>(
    buildUserAccountUrl(id),
  )
  return assertApiSuccess(response, getApiMessage('loadUserDetailFailed')).data
}

export async function checkUserAccountLoginName(
  loginName: string,
  excludeUserId?: string,
) {
  const response = await http.get<
    ApiResponse<UserAccountLoginNameAvailability>
  >(ENDPOINTS.USER_ACCOUNTS_LOGIN_NAME_CHECK, {
    params: { loginName, excludeUserId },
  })
  return assertApiSuccess(response, getApiMessage('checkLoginNameFailed')).data
}

export async function createUserAccount(payload: UserAccountFormPayload) {
  const response = await http.post<ApiResponse<UserAccountCreateResult>>(
    ENDPOINTS.USER_ACCOUNTS,
    payload,
  )
  return assertApiSuccess(response, getApiMessage('createUserFailed'))
}

export async function updateUserAccount(
  id: string,
  payload: UserAccountFormPayload,
) {
  const response = await http.put<ApiResponse<UserAccountRecord>>(
    buildUserAccountUrl(id),
    payload,
  )
  return assertApiSuccess(response, getApiMessage('saveUserFailed'))
}

export async function deleteUserAccount(id: string) {
  const response = await http.delete<ApiResponse<null>>(buildUserAccountUrl(id))
  return assertApiSuccess(response, getApiMessage('deleteUserFailed'))
}

export async function setupUserAccount2fa(id: string) {
  const response = await http.post<ApiResponse<TotpSetupResponse>>(
    `${buildUserAccountUrl(id)}/2fa/setup`,
  )
  return assertApiSuccess(response, getApiMessage('generate2faQrCodeFailed'))
}

export async function enableUserAccount2fa(id: string, totpCode: string) {
  const response = await http.post<ApiResponse<UserAccountRecord>>(
    `${buildUserAccountUrl(id)}/2fa/enable`,
    { totpCode },
  )
  return assertApiSuccess(response, getApiMessage('enable2faFailed'))
}

export async function disableUserAccount2fa(id: string) {
  const response = await http.post<ApiResponse<UserAccountRecord>>(
    `${buildUserAccountUrl(id)}/2fa/disable`,
  )
  return assertApiSuccess(response, getApiMessage('disable2faFailed'))
}

export async function listRoleOptions() {
  const response = await http.get<ApiResponse<PageResponse<RoleOptionRecord>>>(
    ENDPOINTS.ROLE_SETTINGS,
    {
      params: { page: 0, size: 200 },
    },
  )
  return pageContent(
    assertApiSuccess(response, getApiMessage('loadRolesFailed')).data,
  )
}

export async function listDepartmentOptions() {
  const response = await http.get<ApiResponse<DepartmentOptionRecord[]>>(
    ENDPOINTS.DEPARTMENTS_OPTIONS,
  )
  return (
    assertApiSuccess(response, getApiMessage('loadDepartmentsFailed')).data ||
    []
  ).map((item) => ({
    ...item,
    id: String(item.id || ''),
    departmentCode: String(item.departmentCode || ''),
    departmentName: String(item.departmentName || ''),
  }))
}
