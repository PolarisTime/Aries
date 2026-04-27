import { assertApiSuccess, http } from '@/api/client'

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
  records: ApiKeyRecord[]
  page: number
  size: number
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

export async function listApiKeys(params: ListApiKeysParams) {
  const response = assertApiSuccess(
    await http.get('/auth/api-keys', { params }) as unknown as ApiKeyResponse<ApiKeyPageData>,
    '加载 API Key 失败',
  )
  return response.data
}

export async function listApiKeyUserOptions(keyword?: string) {
  const response = assertApiSuccess(
    await http.get('/auth/api-keys/user-options', {
      params: {
        keyword: keyword?.trim() || undefined,
      },
    }) as unknown as ApiKeyResponse<ApiKeyUserOption[]>,
    '加载用户选项失败',
  )
  return response.data || []
}

export async function listApiKeyResourceOptions() {
  const response = assertApiSuccess(
    await http.get('/auth/api-keys/resource-options') as unknown as ApiKeyResponse<ApiKeyResourceOption[]>,
    '加载资源选项失败',
  )
  return response.data || []
}

export async function createApiKey(userId: string | number, payload: {
  keyName: string
  usageScope: string
  allowedResources: string[]
  allowedActions: string[]
  expireDays: number | null
}, totpCode: string) {
  const normalizedTotpCode = totpCode.trim()
  return assertApiSuccess(
    await http.post('/auth/api-keys', payload, {
      params: { userId },
      headers: {
        'X-TOTP-Code': normalizedTotpCode,
      },
    }) as unknown as ApiKeyResponse<ApiKeyRecord>,
    '生成 API Key 失败',
  )
}

export async function listApiKeyActionOptions() {
  const response = assertApiSuccess(
    await http.get('/auth/api-keys/action-options') as unknown as ApiKeyResponse<ApiKeyActionOption[]>,
    '加载动作选项失败',
  )
  return response.data || []
}

export async function revokeApiKey(id: string | number) {
  return assertApiSuccess(
    await http.post(`/auth/api-keys/${id}/revoke`) as unknown as ApiKeyResponse<null>,
    '禁用 API Key 失败',
  )
}

export async function getApiKeyDetail(id: string | number) {
  const response = assertApiSuccess(
    await http.get(`/auth/api-keys/${id}`) as unknown as ApiKeyResponse<ApiKeyRecord>,
    '加载 API Key 详情失败',
  )
  return response.data
}
