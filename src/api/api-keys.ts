import { assertApiSuccess, http } from '@/api/client'
import { pageContent } from '@/api/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import { getApiMessage } from '@/utils/api-messages'

export interface ApiKeyRecord {
  id: string
  userId: string
  loginName: string
  userName: string
  keyName: string
  usageScope: string
  allowedResources: string[]
  allowedActions: string[]
  keyPrefix: string
  rawKey: string | null
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
  status: string
}
export interface ApiKeyUserOption {
  id: string
  loginName: string
  userName: string
  mobile: string | null
}
export interface ApiKeyResourceOption {
  code: string
  title: string
  group: string
}
export interface ApiKeyActionOption {
  code: string
  title: string
}
export interface ApiKeyPageData {
  content?: ApiKeyRecord[]
  records?: ApiKeyRecord[]
  currentPage?: number
  page?: number
  pageSize?: number
  size?: number
  totalElements: number
  totalPages: number
}

interface ApiKeyResponse<T> {
  code: number
  message?: string
  data: T
}
export interface ListApiKeysParams {
  page: number
  size: number
  keyword?: string
  userId?: string
  status?: string
  usageScope?: string
}

function buildApiKeyUrl(id?: string) {
  return id != null ? `${ENDPOINTS.API_KEYS}/${id}` : ENDPOINTS.API_KEYS
}

export async function listApiKeys(params: ListApiKeysParams) {
  const response = assertApiSuccess(
    await http.get<ApiKeyResponse<ApiKeyPageData>>(ENDPOINTS.API_KEYS, {
      params,
    }),
    getApiMessage('loadApiKeyFailed'),
  )
  return {
    ...response.data,
    records: pageContent(response.data),
  }
}
export async function listApiKeyUserOptions(keyword?: string) {
  const response = assertApiSuccess(
    await http.get<ApiKeyResponse<ApiKeyUserOption[]>>(
      ENDPOINTS.API_KEYS_USER_OPTIONS,
      {
        params: { keyword: keyword?.trim() || undefined },
      },
    ),
    getApiMessage('loadUserOptionsFailed'),
  )
  return (response.data || []).map((item) => ({
    ...item,
    id: String(item.id || ''),
    loginName: String(item.loginName || ''),
    userName: String(item.userName || ''),
    mobile: item.mobile == null ? null : String(item.mobile),
  }))
}
export async function listApiKeyResourceOptions() {
  const response = assertApiSuccess(
    await http.get<ApiKeyResponse<ApiKeyResourceOption[]>>(
      ENDPOINTS.API_KEYS_RESOURCE_OPTIONS,
    ),
    getApiMessage('loadResourceOptionsFailed'),
  )
  return response.data || []
}
export async function createApiKey(
  userId: string,
  payload: {
    keyName: string
    usageScope: string
    allowedResources: string[]
    allowedActions: string[]
    expireDays: number | null
  },
  totpCode: string,
) {
  return assertApiSuccess(
    await http.post<ApiKeyResponse<ApiKeyRecord>>(ENDPOINTS.API_KEYS, payload, {
      params: { userId },
      headers: { 'X-TOTP-Code': totpCode.trim() },
    }),
    getApiMessage('generateApiKeyFailed'),
  )
}
export async function listApiKeyActionOptions() {
  const response = assertApiSuccess(
    await http.get<ApiKeyResponse<ApiKeyActionOption[]>>(
      ENDPOINTS.API_KEYS_ACTION_OPTIONS,
    ),
    getApiMessage('loadActionOptionsFailed'),
  )
  return response.data || []
}
export async function revokeApiKey(id: string) {
  return assertApiSuccess(
    await http.post<ApiKeyResponse<null>>(`${buildApiKeyUrl(id)}/revoke`),
    getApiMessage('disableApiKeyFailed'),
  )
}
export async function getApiKeyDetail(id: string) {
  const response = assertApiSuccess(
    await http.get<ApiKeyResponse<ApiKeyRecord>>(buildApiKeyUrl(id)),
    getApiMessage('loadApiKeyDetailFailed'),
  )
  if (!response.data) {
    throw new Error(getApiMessage('loadApiKeyDetailFailed'))
  }
  return response.data
}
