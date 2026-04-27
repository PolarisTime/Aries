import { assertApiSuccess, http } from '@/api/client'

export interface RefreshTokenRecord {
  id: string
  userId: string
  loginName: string
  userName: string
  tokenId: string
  loginIp: string
  deviceInfo: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  status: string
  lastActiveAt: string | null
  online: boolean
}

export interface RefreshTokenPageData {
  records: RefreshTokenRecord[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface RefreshTokenSummaryData {
  onlineUsers: number
  onlineSessions: number
  activeSessions: number
}

interface SessionResponse<T> {
  code: number
  message?: string
  data: T
}

export async function listRefreshTokens(params: { page: number; size: number; keyword?: string }) {
  const response = assertApiSuccess(
    await http.get('/auth/refresh-tokens', { params }) as unknown as SessionResponse<RefreshTokenPageData>,
    '加载会话列表失败',
  )
  return response.data
}

export async function getRefreshTokenSummary() {
  const response = assertApiSuccess(
    await http.get('/auth/refresh-tokens/summary') as unknown as SessionResponse<RefreshTokenSummaryData>,
    '加载会话汇总失败',
  )
  return response.data
}

export async function revokeRefreshToken(id: string | number) {
  return assertApiSuccess(
    await http.post(`/auth/refresh-tokens/${id}/revoke`) as unknown as SessionResponse<null>,
    '禁用会话失败',
  )
}

export async function revokeAllRefreshTokens() {
  return assertApiSuccess(
    await http.post('/auth/refresh-tokens/revoke-all') as unknown as SessionResponse<null>,
    '清除全部会话失败',
  )
}
