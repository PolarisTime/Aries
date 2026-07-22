import { z } from 'zod'
import { apiGet, assertApiSuccess } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { apiResponseSchema } from '@/shared/schemas/api'

const dashboardSummarySchema = z.object({
  appName: z.string(),
  companyName: z.string().nullable(),
  userName: z.string(),
  loginName: z.string(),
  visibleMenuCount: z.number().int().nonnegative(),
  moduleCount: z.number().int().nonnegative(),
  activeSessionCount: z.number().int().nonnegative(),
  lastLoginAt: z.string().nullable(),
  serverTime: z.string(),
  materialCount: z.number().int().nonnegative(),
  supplierCount: z.number().int().nonnegative(),
  customerCount: z.number().int().nonnegative(),
})
const dashboardSummaryResponseSchema = apiResponseSchema(dashboardSummarySchema)

export type DashboardSummary = z.output<typeof dashboardSummarySchema>

export async function getDashboardSummary() {
  const response = assertApiSuccess(
    await apiGet(ENDPOINTS.DASHBOARD_SUMMARY, dashboardSummaryResponseSchema),
    '加载工作台摘要失败',
  )
  return response.data
}
