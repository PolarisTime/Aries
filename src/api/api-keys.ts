import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'

export interface ApiKeyRecord {
  id: string; userId: string; loginName: string; userName: string; keyName: string
  usageScope: string; allowedResources: string[]; allowedActions: string[]
  keyPrefix: string; rawKey: string | null; createdAt: string; expiresAt: string | null
  lastUsedAt: string | null; status: string
}
export interface ApiKeyUserOption { id: string; loginName: string; userName: string; mobile: string | null }
export interface ApiKeyResourceOption { code: string; title: string; group: string }
export interface ApiKeyActionOption { code: string; title: string }
export interface ApiKeyPageData { records: ApiKeyRecord[]; page: number; size: number; totalElements: number; totalPages: number }

interface ApiKeyResponse<T> { code: number; message?: string; data: T }
export interface ListApiKeysParams { page: number; size: number; keyword?: string; userId?: string; status?: string; usageScope?: string }

function buildApiKeyUrl(id?: string | number) {
  return id != null ? `${ENDPOINTS.API_KEYS}/${id}` : ENDPOINTS.API_KEYS
}

export async function listApiKeys(params: ListApiKeysParams) {
  const response = assertApiSuccess(
    await http.get<ApiKeyResponse<ApiKeyPageData>>(ENDPOINTS.API_KEYS, { params }),
    '加载 API Key 失败',
  )
  return response.data
}
export async function listApiKeyUserOptions(keyword?: string) {
  const response = assertApiSuccess(
    await http.get<ApiKeyResponse<ApiKeyUserOption[]>>(ENDPOINTS.API_KEYS_USER_OPTIONS, {
      params: { keyword: keyword?.trim() || undefined },
    }),
    '加载用户选项失败',
  )
  return response.data || []
}
export async function listApiKeyResourceOptions() {
  const response = assertApiSuccess(
    await http.get<ApiKeyResponse<ApiKeyResourceOption[]>>(ENDPOINTS.API_KEYS_RESOURCE_OPTIONS),
    '加载资源选项失败',
  )
  return response.data || []
}
export async function createApiKey(userId: string | number, payload: {
  keyName: string; usageScope: string; allowedResources: string[]; allowedActions: string[]; expireDays: number | null
}, totpCode: string) {
  return assertApiSuccess(
    await http.post<ApiKeyResponse<ApiKeyRecord>>(ENDPOINTS.API_KEYS, payload, {
      params: { userId },
      headers: { 'X-TOTP-Code': totpCode.trim() },
    }),
    '生成 API Key 失败',
  )
}
export async function listApiKeyActionOptions() {
  const response = assertApiSuccess(
    await http.get<ApiKeyResponse<ApiKeyActionOption[]>>(ENDPOINTS.API_KEYS_ACTION_OPTIONS),
    '加载动作选项失败',
  )
  return response.data || []
}
export async function revokeApiKey(id: string | number) {
  return assertApiSuccess(
    await http.post<ApiKeyResponse<null>>(`${buildApiKeyUrl(id)}/revoke`),
    '禁用 API Key 失败',
  )
}
export async function getApiKeyDetail(id: string | number) {
  const response = assertApiSuccess(
    await http.get<ApiKeyResponse<ApiKeyRecord>>(buildApiKeyUrl(id)),
    '加载 API Key 详情失败',
  )
  return response.data
}
