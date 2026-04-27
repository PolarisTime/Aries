import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'

export interface DashboardSummary {
  appName: string
  companyName: string | null
  userName: string
  loginName: string
  roleName: string | null
  visibleMenuCount: number
  moduleCount: number
  actionCount: number
  activeSessionCount: number
  totpEnabled: boolean
  lastLoginAt: string | null
  serverTime: string
}

interface DashboardSummaryResponse<T> {
  code: number
  message?: string
  data: T
}

export async function getDashboardSummary() {
  const response = assertApiSuccess(
    await http.get<DashboardSummaryResponse<DashboardSummary>>(ENDPOINTS.DASHBOARD_SUMMARY),
    '加载工作台摘要失败',
  )
  return response.data
}
