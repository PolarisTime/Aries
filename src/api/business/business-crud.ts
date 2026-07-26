import { normalizeRecord } from '@/api/business/business-normalizers'
import { toSaveRequest } from '@/api/business/module-save-payload'
import { getModuleConfig } from '@/api/contracts/module-contracts'
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  assertApiSuccess,
} from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import {
  nullResponseSchema,
  rawRecordResponseSchema,
} from '@/shared/schemas/api'
import {
  getMainFlowDetailResponseSchema,
  type MainFlowModuleKey,
  parseMainFlowStatus,
} from '@/shared/schemas/module-record'
import type { ApiResponse } from '@/types/api'
import type {
  LegacyModuleRecord,
  LegacyModuleRecordInput,
  MainFlowDetailRecord,
  MainFlowEditorDraft,
  ModuleDetailRecordFor,
  ModuleEditorDraftFor,
} from '@/types/module-record'

type BusinessModuleSaveRecord =
  | LegacyModuleRecordInput
  | MainFlowEditorDraft<MainFlowModuleKey>

export function getBusinessModuleDetail<Key extends MainFlowModuleKey>(
  moduleKey: Key,
  id: string,
): Promise<ApiResponse<MainFlowDetailRecord<Key>>>
export function getBusinessModuleDetail<Key extends string>(
  moduleKey: Key,
  id: string,
): Promise<ApiResponse<ModuleDetailRecordFor<Key>>>
export async function getBusinessModuleDetail(
  moduleKey: string,
  id: string,
): Promise<ApiResponse<LegacyModuleRecord>> {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly && !endpointConfig.supportsDetail) {
    throw new Error('当前模块不支持详情接口')
  }

  const path = `${endpointConfig.path}/${encodeURIComponent(id)}`
  const mainFlowResponseSchema = getMainFlowDetailResponseSchema(moduleKey)
  if (mainFlowResponseSchema) {
    const response = assertApiSuccess(
      await apiGet(path, mainFlowResponseSchema),
    )
    return {
      code: response.code,
      message: response.message,
      data: response.data,
    }
  }

  const response = assertApiSuccess(await apiGet(path, rawRecordResponseSchema))

  return {
    code: response.code,
    message: response.message,
    data: normalizeRecord(response.data || {}),
  }
}

export function saveBusinessModule<Key extends MainFlowModuleKey>(
  moduleKey: Key,
  record: MainFlowEditorDraft<Key>,
  idempotencyKey?: string,
): Promise<ApiResponse<MainFlowDetailRecord<Key> | undefined>>
export function saveBusinessModule<Key extends string>(
  moduleKey: Key,
  record: ModuleEditorDraftFor<Key>,
  idempotencyKey?: string,
): Promise<ApiResponse<ModuleDetailRecordFor<Key> | undefined>>
export async function saveBusinessModule(
  moduleKey: string,
  record: BusinessModuleSaveRecord,
  idempotencyKey?: string,
): Promise<ApiResponse<LegacyModuleRecord | undefined>> {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持保存')
  }

  const payload = await toSaveRequest(moduleKey, record)
  const hasId = Boolean(record.id)
  const path = hasId
    ? `${endpointConfig.path}/${encodeURIComponent(String(record.id))}`
    : endpointConfig.path
  const requestConfig = withIdempotencyKey(undefined, idempotencyKey)
  const mainFlowResponseSchema = getMainFlowDetailResponseSchema(moduleKey)
  if (mainFlowResponseSchema) {
    const response = assertApiSuccess(
      hasId
        ? await apiPut(path, mainFlowResponseSchema, payload, requestConfig)
        : await apiPost(path, mainFlowResponseSchema, payload, requestConfig),
    )
    return {
      code: response.code,
      message: response.message,
      data: response.data,
    }
  }

  const response = assertApiSuccess(
    hasId
      ? await apiPut(path, rawRecordResponseSchema, payload, requestConfig)
      : await apiPost(path, rawRecordResponseSchema, payload, requestConfig),
  )

  return {
    code: response.code,
    message: response.message,
    data: response.data ? normalizeRecord(response.data) : undefined,
  }
}

export function saveAndAuditBusinessModule<Key extends MainFlowModuleKey>(
  moduleKey: Key,
  record: MainFlowEditorDraft<Key>,
  idempotencyKey?: string,
): Promise<ApiResponse<MainFlowDetailRecord<Key> | undefined>>
export function saveAndAuditBusinessModule<Key extends string>(
  moduleKey: Key,
  record: ModuleEditorDraftFor<Key>,
  idempotencyKey?: string,
): Promise<ApiResponse<ModuleDetailRecordFor<Key> | undefined>>
export async function saveAndAuditBusinessModule(
  moduleKey: string,
  record: BusinessModuleSaveRecord,
  idempotencyKey?: string,
): Promise<ApiResponse<LegacyModuleRecord | undefined>> {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持保存并审核')
  }

  const payload = await toSaveRequest(moduleKey, record)
  const hasId = Boolean(record.id)
  const path = hasId
    ? `${endpointConfig.path}/${encodeURIComponent(String(record.id))}/save-and-audit`
    : `${endpointConfig.path}/save-and-audit`
  const requestConfig = withIdempotencyKey(undefined, idempotencyKey)
  const mainFlowResponseSchema = getMainFlowDetailResponseSchema(moduleKey)
  if (mainFlowResponseSchema) {
    const response = assertApiSuccess(
      hasId
        ? await apiPut(path, mainFlowResponseSchema, payload, requestConfig)
        : await apiPost(path, mainFlowResponseSchema, payload, requestConfig),
    )
    return {
      code: response.code,
      message: response.message,
      data: response.data,
    }
  }

  const response = assertApiSuccess(
    hasId
      ? await apiPut(path, rawRecordResponseSchema, payload, requestConfig)
      : await apiPost(path, rawRecordResponseSchema, payload, requestConfig),
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

export function updateBusinessModuleStatus<Key extends MainFlowModuleKey>(
  moduleKey: Key,
  id: string,
  status: string,
): Promise<ApiResponse<MainFlowDetailRecord<Key> | undefined>>
export function updateBusinessModuleStatus<Key extends string>(
  moduleKey: Key,
  id: string,
  status: string,
): Promise<ApiResponse<ModuleDetailRecordFor<Key> | undefined>>
export async function updateBusinessModuleStatus(
  moduleKey: string,
  id: string,
  status: string,
): Promise<ApiResponse<LegacyModuleRecord | undefined>> {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持状态变更')
  }

  const path = `${endpointConfig.path}/${encodeURIComponent(id)}/status`
  const payload = { status: parseMainFlowStatus(moduleKey, status) }
  const requestConfig = withIdempotencyKey()
  const mainFlowResponseSchema = getMainFlowDetailResponseSchema(moduleKey)
  if (mainFlowResponseSchema) {
    const response = assertApiSuccess(
      await apiPatch(path, mainFlowResponseSchema, payload, requestConfig),
    )
    return {
      code: response.code,
      message: response.message,
      data: response.data,
    }
  }

  const response = assertApiSuccess(
    await apiPatch(path, rawRecordResponseSchema, payload, requestConfig),
  )

  return {
    code: response.code,
    message: response.message,
    data: response.data ? normalizeRecord(response.data) : undefined,
  }
}
