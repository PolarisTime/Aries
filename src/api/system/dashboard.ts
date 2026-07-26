import { z } from 'zod'
import { apiGet, assertApiSuccess } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import {
  apiResponseSchema,
  responseDateTimeSchema,
  responseNonNegativeIntegerSchema,
} from '@/shared/schemas/api'

const dashboardSummarySchema = z.object({
  appName: z.string(),
  companyName: z.string().nullable(),
  userName: z.string(),
  loginName: z.string(),
  activeSessionCount: responseNonNegativeIntegerSchema,
  lastLoginAt: responseDateTimeSchema.nullable(),
  serverTime: responseDateTimeSchema,
  materialCount: responseNonNegativeIntegerSchema,
  supplierCount: responseNonNegativeIntegerSchema,
  customerCount: responseNonNegativeIntegerSchema,
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
