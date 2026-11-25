import { z } from 'zod'
import {
  apiDeleteNoContent,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import { exactPageSchema, responseEntityIdSchema } from '@/shared/schemas/api'
import { responseDecimalSchema } from '@/shared/schemas/decimal'
import type { EntityId } from '@/types/entity-id'

export const PROJECT_OPENING_BALANCE_TYPES = ['RECEIVABLE', 'ADVANCE'] as const
export type ProjectOpeningBalanceType =
  (typeof PROJECT_OPENING_BALANCE_TYPES)[number]

export const PROJECT_OPENING_BALANCE_STATUSES = ['DRAFT', 'CONFIRMED'] as const
export type ProjectOpeningBalanceStatus =
  (typeof PROJECT_OPENING_BALANCE_STATUSES)[number]

const nullableStringSchema = z
  .string()
  .nullish()
  .transform((value) => value ?? null)

const resourceVersionSchema = z
  .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
  .nullish()
  .transform((value) => (value == null ? undefined : String(value)))

export const projectOpeningBalanceSchema = z.object({
  id: responseEntityIdSchema,
  balanceNo: z.string(),
  projectId: responseEntityIdSchema,
  projectName: z.string(),
  projectNameAbbr: nullableStringSchema,
  customerId: responseEntityIdSchema,
  customerCode: nullableStringSchema,
  customerName: z.string(),
  settlementCompanyId: responseEntityIdSchema,
  settlementCompanyName: z.string(),
  balanceType: z.enum(PROJECT_OPENING_BALANCE_TYPES),
  cutoffDate: z.string(),
  openingAmount: responseDecimalSchema,
  settledAmount: responseDecimalSchema,
  remainingAmount: responseDecimalSchema,
  status: z.enum(PROJECT_OPENING_BALANCE_STATUSES),
  confirmedAt: nullableStringSchema,
  confirmedBy: responseEntityIdSchema
    .nullish()
    .transform((value) => value ?? null),
  confirmedByName: nullableStringSchema,
  legacyDocNo: nullableStringSchema,
  remark: nullableStringSchema,
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema,
  version: resourceVersionSchema,
})

export type ProjectOpeningBalanceRecord = z.output<
  typeof projectOpeningBalanceSchema
>

export const projectOpeningBalancePageSchema = exactPageSchema(
  projectOpeningBalanceSchema,
)

export const projectOpeningBalanceSummarySchema = z.object({
  recordCount: z.coerce.number().int().nonnegative(),
  confirmedCount: z.coerce.number().int().nonnegative(),
  draftCount: z.coerce.number().int().nonnegative(),
  openingReceivableAmount: responseDecimalSchema,
  openingSettledAmount: responseDecimalSchema,
  openingRemainingAmount: responseDecimalSchema,
  openingAdvanceAmount: responseDecimalSchema,
  openingNetBalance: responseDecimalSchema,
})

export type ProjectOpeningBalanceSummary = z.output<
  typeof projectOpeningBalanceSummarySchema
>

export const projectOpeningBalanceOptionSchema = z.object({
  id: responseEntityIdSchema,
  balanceNo: z.string(),
  projectId: responseEntityIdSchema,
  projectName: z.string(),
  customerId: responseEntityIdSchema,
  customerCode: nullableStringSchema,
  customerName: z.string(),
  settlementCompanyId: responseEntityIdSchema,
  settlementCompanyName: z.string(),
  cutoffDate: z.string(),
  openingAmount: responseDecimalSchema,
  settledAmount: responseDecimalSchema,
  remainingAmount: responseDecimalSchema,
  legacyDocNo: nullableStringSchema,
})

export type ProjectOpeningBalanceOption = z.output<
  typeof projectOpeningBalanceOptionSchema
>

const projectOpeningBalanceOptionListSchema = z.array(
  projectOpeningBalanceOptionSchema,
)

export interface ProjectOpeningBalanceFilterParams {
  keyword?: string
  projectId?: EntityId
  customerId?: EntityId
  settlementCompanyId?: EntityId
  balanceType?: ProjectOpeningBalanceType
  status?: ProjectOpeningBalanceStatus
  startDate?: string
  endDate?: string
}

export interface ProjectOpeningBalancePageParams
  extends ProjectOpeningBalanceFilterParams {
  page: number
  size: number
}

export interface ProjectOpeningBalanceUpsertPayload {
  balanceNo?: string
  projectId: EntityId
  balanceType: ProjectOpeningBalanceType
  cutoffDate: string
  openingAmount: number
  legacyDocNo?: string
  remark?: string
  confirm?: boolean
}

function buildFilterParams(params: ProjectOpeningBalanceFilterParams) {
  return {
    ...(params.keyword?.trim() ? { keyword: params.keyword.trim() } : {}),
    ...(params.projectId ? { projectId: params.projectId } : {}),
    ...(params.customerId ? { customerId: params.customerId } : {}),
    ...(params.settlementCompanyId
      ? { settlementCompanyId: params.settlementCompanyId }
      : {}),
    ...(params.balanceType ? { balanceType: params.balanceType } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.startDate ? { startDate: params.startDate } : {}),
    ...(params.endDate ? { endDate: params.endDate } : {}),
  }
}

export function listProjectOpeningBalances(
  params: ProjectOpeningBalancePageParams,
  signal?: AbortSignal,
) {
  return apiGet(
    ENDPOINTS.PROJECT_OPENING_BALANCES,
    projectOpeningBalancePageSchema,
    {
      params: {
        ...buildFilterParams(params),
        page: params.page,
        size: params.size,
      },
      ...(signal ? { signal } : {}),
    },
  )
}

export function getProjectOpeningBalanceSummary(
  params: ProjectOpeningBalanceFilterParams,
  signal?: AbortSignal,
) {
  return apiGet(
    ENDPOINTS.PROJECT_OPENING_BALANCES_SUMMARY,
    projectOpeningBalanceSummarySchema,
    {
      params: buildFilterParams(params),
      ...(signal ? { signal } : {}),
    },
  )
}

export function listAllocatableProjectOpeningBalances(
  params: {
    projectId?: EntityId
    customerId?: EntityId
    settlementCompanyId?: EntityId
  },
  signal?: AbortSignal,
) {
  return apiGet(
    ENDPOINTS.PROJECT_OPENING_BALANCES_ALLOCATABLE,
    projectOpeningBalanceOptionListSchema,
    {
      params: {
        ...(params.projectId ? { projectId: params.projectId } : {}),
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.settlementCompanyId
          ? { settlementCompanyId: params.settlementCompanyId }
          : {}),
      },
      ...(signal ? { signal } : {}),
    },
  )
}

export function createProjectOpeningBalance(
  payload: ProjectOpeningBalanceUpsertPayload,
  idempotencyKey?: string,
) {
  return apiPost(
    ENDPOINTS.PROJECT_OPENING_BALANCES,
    projectOpeningBalanceSchema,
    payload,
    withIdempotencyKey(undefined, idempotencyKey),
  )
}

export function updateProjectOpeningBalance(
  id: EntityId,
  payload: ProjectOpeningBalanceUpsertPayload,
  version?: string,
  idempotencyKey?: string,
) {
  return apiPut(
    ENDPOINTS.PROJECT_OPENING_BALANCE(id),
    projectOpeningBalanceSchema,
    payload,
    withIdempotencyKey(
      version ? { headers: { 'X-Resource-Version': version } } : undefined,
      idempotencyKey,
    ),
  )
}

export function updateProjectOpeningBalanceStatus(
  id: EntityId,
  status: ProjectOpeningBalanceStatus,
  idempotencyKey?: string,
) {
  return apiPatch(
    ENDPOINTS.PROJECT_OPENING_BALANCE_STATUS(id),
    projectOpeningBalanceSchema,
    { status },
    withIdempotencyKey(undefined, idempotencyKey),
  )
}

export function deleteProjectOpeningBalance(
  id: EntityId,
  idempotencyKey?: string,
) {
  return apiDeleteNoContent(
    ENDPOINTS.PROJECT_OPENING_BALANCE(id),
    withIdempotencyKey(undefined, idempotencyKey),
  )
}
