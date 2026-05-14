import { assertApiSuccess, http } from '@/api/client'
import { pageContent } from '@/api/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import { getApiMessage } from '@/utils/api-messages'

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
  content?: RefreshTokenRecord[]
  records?: RefreshTokenRecord[]
  currentPage?: number
  page?: number
  pageSize?: number
  size?: number
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

export async function listRefreshTokens(params: {
  page: number
  size: number
  keyword?: string
}) {
  const response = assertApiSuccess(
    await http.get<SessionResponse<RefreshTokenPageData>>(
      ENDPOINTS.REFRESH_TOKENS,
      { params },
    ),
    getApiMessage('loadSessionsFailed'),
  )
  return {
    ...response.data,
    records: pageContent(response.data),
  }
}
export async function getRefreshTokenSummary() {
  const response = assertApiSuccess(
    await http.get<SessionResponse<RefreshTokenSummaryData>>(
      ENDPOINTS.REFRESH_TOKENS_SUMMARY,
    ),
    getApiMessage('loadSessionSummaryFailed'),
  )
  return response.data
}
export async function revokeRefreshToken(id: string) {
  return assertApiSuccess(
    await http.post<SessionResponse<null>>(
      `${ENDPOINTS.REFRESH_TOKENS}/${id}/revoke`,
    ),
    getApiMessage('disableSessionFailed'),
  )
}
export async function revokeAllRefreshTokens() {
  return assertApiSuccess(
    await http.post<SessionResponse<null>>(
      `${ENDPOINTS.REFRESH_TOKENS}/revoke-all`,
    ),
    getApiMessage('clearAllSessionsFailed'),
  )
}
