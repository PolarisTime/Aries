import type { AxiosResponse } from 'axios'
import { parseApiContract } from '@/api/core/api-contract'
import {
  apiDeleteNoContent,
  apiGet,
  apiPatch,
  apiPostResponse,
  apiPutResponse,
} from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import {
  readResourceVersionHeader,
  withConcurrencyHeaders,
} from '@/api/market/quote-concurrency'
import { ENDPOINTS } from '@/constants/endpoints'
import type {
  SalesContractCheck,
  SalesContractResponse,
  SalesContractStatus,
  SalesContractUpsertPayload,
} from '@/shared/schemas/sales-contract'
import {
  salesContractCheckSchema,
  salesContractListPageSchema,
  salesContractResponseSchema,
  salesContractStatusSchema,
  salesContractUpsertPayloadSchema,
} from '@/shared/schemas/sales-contract'
import type { EntityId } from '@/types/entity-id'

export type {
  SalesContractCheck,
  SalesContractResponse,
  SalesContractStatus,
  SalesContractUpsertPayload,
} from '@/shared/schemas/sales-contract'

export interface SalesContractListParams {
  keyword?: string
  customerId?: EntityId
  projectId?: EntityId
  status?: SalesContractStatus
  /** 0 基页码，与后端 PageResponse 契约一致。 */
  page: number
  size: number
}

export interface SalesOrderContractCheckParams {
  projectId: EntityId
  amount: number
  tonnage: number
  excludeOrderId?: EntityId
}

/** 创建/更新写响应：把 X-Resource-Version 响应头合并为记录版本号。 */
function withHeaderVersion(
  record: SalesContractResponse,
  headers: AxiosResponse['headers'],
): SalesContractResponse {
  if (record.version) {
    return record
  }
  const headerVersion = readResourceVersionHeader(headers)
  return headerVersion ? { ...record, version: headerVersion } : record
}

export function listSalesContracts(
  params: SalesContractListParams,
  signal?: AbortSignal,
) {
  return apiGet(ENDPOINTS.SALES_CONTRACTS, salesContractListPageSchema, {
    params: {
      page: params.page,
      size: params.size,
      keyword: params.keyword || undefined,
      customerId: params.customerId || undefined,
      projectId: params.projectId || undefined,
      status: params.status || undefined,
    },
    ...(signal ? { signal } : {}),
  })
}

export function getSalesContract(id: EntityId, signal?: AbortSignal) {
  return apiGet(ENDPOINTS.SALES_CONTRACT(id), salesContractResponseSchema, {
    ...(signal ? { signal } : {}),
  })
}

export async function createSalesContract(
  payload: SalesContractUpsertPayload,
): Promise<SalesContractResponse> {
  const validatedPayload = parseApiContract(
    salesContractUpsertPayloadSchema,
    payload,
    '新增销售合同请求',
  )
  const response = await apiPostResponse(
    ENDPOINTS.SALES_CONTRACTS,
    salesContractResponseSchema,
    validatedPayload,
    withIdempotencyKey(),
  )
  return withHeaderVersion(response.data, response.headers)
}

export async function updateSalesContract(
  id: EntityId,
  payload: SalesContractUpsertPayload,
  expectedVersion?: string,
): Promise<SalesContractResponse> {
  const validatedPayload = parseApiContract(
    salesContractUpsertPayloadSchema,
    payload,
    '更新销售合同请求',
  )
  const response = await apiPutResponse(
    ENDPOINTS.SALES_CONTRACT(id),
    salesContractResponseSchema,
    validatedPayload,
    withConcurrencyHeaders(expectedVersion, withIdempotencyKey()),
  )
  return withHeaderVersion(response.data, response.headers)
}

export function deleteSalesContract(id: EntityId): Promise<void> {
  return apiDeleteNoContent(ENDPOINTS.SALES_CONTRACT(id), withIdempotencyKey())
}

export function updateSalesContractStatus(
  id: EntityId,
  status: SalesContractStatus,
): Promise<SalesContractResponse> {
  const validatedStatus = parseApiContract(
    salesContractStatusSchema,
    status,
    '更新销售合同状态请求',
  )
  return apiPatch(
    ENDPOINTS.SALES_CONTRACT_STATUS(id),
    salesContractResponseSchema,
    { status: validatedStatus },
    withIdempotencyKey(),
  )
}

/** 销售订单保存前的合同额度校验（只读、非阻断）。 */
export function fetchSalesOrderContractCheck(
  params: SalesOrderContractCheckParams,
  signal?: AbortSignal,
): Promise<SalesContractCheck> {
  return apiGet(
    ENDPOINTS.SALES_ORDER_CONTRACT_CHECKS,
    salesContractCheckSchema,
    {
      params: {
        projectId: params.projectId,
        amount: params.amount,
        tonnage: params.tonnage,
        excludeOrderId: params.excludeOrderId || undefined,
      },
      ...(signal ? { signal } : {}),
    },
  )
}
