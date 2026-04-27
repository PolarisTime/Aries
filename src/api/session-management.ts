import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'

export interface RefreshTokenRecord {
  id: string; userId: string; loginName: string; userName: string
  tokenId: string; loginIp: string; deviceInfo: string; createdAt: string
  expiresAt: string; revokedAt: string | null; status: string
  lastActiveAt: string | null; online: boolean
}
export interface RefreshTokenPageData { records: RefreshTokenRecord[]; page: number; size: number; totalElements: number; totalPages: number }
export interface RefreshTokenSummaryData { onlineUsers: number; onlineSessions: number; activeSessions: number }

interface SessionResponse<T> { code: number; message?: string; data: T }

export async function listRefreshTokens(params: { page: number; size: number; keyword?: string }) {
  const response = assertApiSuccess(
    await http.get<SessionResponse<RefreshTokenPageData>>(ENDPOINTS.REFRESH_TOKENS, { params }),
    '加载会话列表失败',
  )
  return response.data
}
export async function getRefreshTokenSummary() {
  const response = assertApiSuccess(
    await http.get<SessionResponse<RefreshTokenSummaryData>>(ENDPOINTS.REFRESH_TOKENS_SUMMARY),
    '加载会话汇总失败',
  )
  return response.data
}
export async function revokeRefreshToken(id: string | number) {
  return assertApiSuccess(
    await http.post<SessionResponse<null>>(`${ENDPOINTS.REFRESH_TOKENS}/${id}/revoke`),
    '禁用会话失败',
  )
}
export async function revokeAllRefreshTokens() {
  return assertApiSuccess(
    await http.post<SessionResponse<null>>(`${ENDPOINTS.REFRESH_TOKENS}/revoke-all`),
    '清除全部会话失败',
  )
}
