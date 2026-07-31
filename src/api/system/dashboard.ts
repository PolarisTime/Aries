import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import {
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
const dashboardSummaryResponseSchema = dashboardSummarySchema

export type DashboardSummary = z.output<typeof dashboardSummarySchema>

export async function getDashboardSummary() {
  return apiGet(ENDPOINTS.DASHBOARD_SUMMARY, dashboardSummaryResponseSchema)
}
