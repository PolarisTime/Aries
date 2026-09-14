import type { AxiosRequestConfig } from 'axios'
import {
  deleteBusinessModule,
  getBusinessModuleDetail,
  saveAndAuditBusinessModule,
  saveBusinessModule,
  updateBusinessModuleStatus,
} from '@/api/business/business-crud'
import { listBusinessModule } from '@/api/business/business-listing'
import { apiGet, apiPost } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import type {
  SalesReturn,
  SalesReturnCandidates,
  SalesReturnListRecord,
  SalesReturnSaveRequest,
} from '@/shared/schemas/module-record'
import {
  mainFlowDetailResponseSchemas,
  salesReturnCandidatesSchema,
} from '@/shared/schemas/module-record'
import type { TableResponse } from '@/types/api'
import type { SearchParams } from '@/types/api-raw'
import type { MainFlowEditorDraft } from '@/types/module-record'
import type { ListQueryOptions } from '@/utils/list'

const MODULE_KEY = 'sales-return' as const

const salesReturnDetailResponseSchema =
  mainFlowDetailResponseSchemas[MODULE_KEY]

export function listSalesReturns(
  search: SearchParams,
  options: ListQueryOptions,
  config?: AxiosRequestConfig,
): Promise<TableResponse<SalesReturnListRecord>> {
  return listBusinessModule(MODULE_KEY, search, options, config)
}

export function getSalesReturn(
  id: string,
  signal?: AbortSignal,
): Promise<SalesReturn> {
  return getBusinessModuleDetail(MODULE_KEY, id, signal)
}

/**
 * 销售退货来源候选：按已审核销售出库读取可退明细（含已退/可退数量）。
 */
export function getSalesReturnCandidates(
  salesOutboundId: string,
  signal?: AbortSignal,
): Promise<SalesReturnCandidates> {
  return apiGet(
    ENDPOINTS.SALES_RETURN_CANDIDATES,
    salesReturnCandidatesSchema,
    { params: { salesOutboundId }, signal },
  )
}

export function createSalesReturn(
  record: MainFlowEditorDraft<typeof MODULE_KEY>,
  idempotencyKey?: string,
): Promise<SalesReturn> {
  return saveBusinessModule(MODULE_KEY, record, idempotencyKey)
}

/**
 * 从销售出库来源候选直接创建退货草稿；请求体已按来源契约组装，
 * 经由统一保存通道完成字段白名单与实体 ID 序列化。
 */
export function createSalesReturnFromSource(
  payload: SalesReturnSaveRequest,
  idempotencyKey?: string,
): Promise<SalesReturn> {
  return saveBusinessModule(
    MODULE_KEY,
    payload as unknown as MainFlowEditorDraft<typeof MODULE_KEY>,
    idempotencyKey,
  )
}

export function updateSalesReturn(
  record: MainFlowEditorDraft<typeof MODULE_KEY>,
  idempotencyKey?: string,
): Promise<SalesReturn> {
  return saveBusinessModule(MODULE_KEY, record, idempotencyKey)
}

export function auditSalesReturn(
  id: string,
  idempotencyKey?: string,
): Promise<SalesReturn> {
  return apiPost(
    ENDPOINTS.SALES_RETURN_AUDITS(id),
    salesReturnDetailResponseSchema,
    null,
    withIdempotencyKey(undefined, idempotencyKey),
  )
}

export function saveAndAuditSalesReturn(
  record: MainFlowEditorDraft<typeof MODULE_KEY>,
  idempotencyKey?: string,
): Promise<SalesReturn> {
  return saveAndAuditBusinessModule(MODULE_KEY, record, idempotencyKey)
}

export function updateSalesReturnStatus(
  id: string,
  status: string,
): Promise<SalesReturn> {
  return updateBusinessModuleStatus(MODULE_KEY, id, status)
}

export function deleteSalesReturn(id: string): Promise<void> {
  return deleteBusinessModule(MODULE_KEY, id)
}
