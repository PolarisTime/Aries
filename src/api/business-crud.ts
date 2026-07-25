import { normalizeRecord } from '@/api/business-normalizers'
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  assertApiSuccess,
} from '@/api/client'
import { withIdempotencyKey } from '@/api/idempotency'
import { getModuleConfig } from '@/api/module-contracts'
import { serializeBusinessRecordForSave } from '@/api/module-save-payload'
import {
  nullResponseSchema,
  rawRecordResponseSchema,
} from '@/shared/schemas/api'
import type { ModuleRecord } from '@/types/module-page'

export async function getBusinessModuleDetail(moduleKey: string, id: string) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly && !endpointConfig.supportsDetail) {
    throw new Error('当前模块不支持详情接口')
  }

  const response = assertApiSuccess(
    await apiGet(
      `${endpointConfig.path}/${encodeURIComponent(id)}`,
      rawRecordResponseSchema,
    ),
  )

  return {
    code: response.code,
    message: response.message,
    data: normalizeRecord(response.data || {}),
  }
}

export async function saveBusinessModule(
  moduleKey: string,
  record: ModuleRecord,
  idempotencyKey?: string,
) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持保存')
  }

  const payload = await serializeBusinessRecordForSave(moduleKey, record)
  const hasId = Boolean(record.id)
  const response = assertApiSuccess(
    hasId
      ? await apiPut(
          `${endpointConfig.path}/${encodeURIComponent(String(record.id))}`,
          rawRecordResponseSchema,
          payload,
          withIdempotencyKey(undefined, idempotencyKey),
        )
      : await apiPost(
          endpointConfig.path,
          rawRecordResponseSchema,
          payload,
          withIdempotencyKey(undefined, idempotencyKey),
        ),
  )

  return {
    code: response.code,
    message: response.message,
    data: response.data ? normalizeRecord(response.data) : undefined,
  }
}

export async function saveAndAuditBusinessModule(
  moduleKey: string,
  record: ModuleRecord,
  idempotencyKey?: string,
) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持保存并审核')
  }

  const payload = await serializeBusinessRecordForSave(moduleKey, record)
  const hasId = Boolean(record.id)
  const response = assertApiSuccess(
    hasId
      ? await apiPut(
          `${endpointConfig.path}/${encodeURIComponent(String(record.id))}/save-and-audit`,
          rawRecordResponseSchema,
          payload,
          withIdempotencyKey(undefined, idempotencyKey),
        )
      : await apiPost(
          `${endpointConfig.path}/save-and-audit`,
          rawRecordResponseSchema,
          payload,
          withIdempotencyKey(undefined, idempotencyKey),
        ),
  )

  return {
    code: response.code,
    message: response.message,
    data: response.data ? normalizeRecord(response.data) : undefined,
  }
}

export async function deleteBusinessModule(moduleKey: string, id: string) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持删除')
  }

  return apiDelete(
    `${endpointConfig.path}/${encodeURIComponent(id)}`,
    nullResponseSchema,
    withIdempotencyKey(),
  )
}

export async function updateBusinessModuleStatus(
  moduleKey: string,
  id: string,
  status: string,
) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持状态变更')
  }

  const response = assertApiSuccess(
    await apiPatch(
      `${endpointConfig.path}/${encodeURIComponent(id)}/status`,
      rawRecordResponseSchema,
      { status },
      withIdempotencyKey(),
    ),
  )

  return {
    code: response.code,
    message: response.message,
    data: response.data ? normalizeRecord(response.data) : undefined,
  }
}
