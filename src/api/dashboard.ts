import { assertApiSuccess, http } from '@/api/client'

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
    (await http.get('/dashboard/summary')) as unknown as DashboardSummaryResponse<DashboardSummary>,
    '加载工作台摘要失败',
  )
  return response.data
}
