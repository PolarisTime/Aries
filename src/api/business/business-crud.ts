import { normalizeRecord } from '@/api/business/business-normalizers'
import { getModuleConfig } from '@/api/contracts/module-contracts'
import {
  apiDeleteNoContent,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { toSaveRequest } from '@/module-system/record/module-save-payload'
import { rawRecordSchema } from '@/shared/schemas/api'
import {
  getMainFlowDetailResponseSchema,
  type MainFlowModuleKey,
  parseMainFlowStatus,
} from '@/shared/schemas/module-record'
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
): Promise<MainFlowDetailRecord<Key>>
export function getBusinessModuleDetail<Key extends string>(
  moduleKey: Key,
  id: string,
): Promise<ModuleDetailRecordFor<Key>>
export async function getBusinessModuleDetail(
  moduleKey: string,
  id: string,
): Promise<LegacyModuleRecord> {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly && !endpointConfig.supportsDetail) {
    throw new Error('当前模块不支持详情接口')
  }

  const path = `${endpointConfig.path}/${encodeURIComponent(id)}`
  const mainFlowResponseSchema = getMainFlowDetailResponseSchema(moduleKey)
  if (mainFlowResponseSchema) {
    return apiGet(path, mainFlowResponseSchema)
  }

  return normalizeRecord(await apiGet(path, rawRecordSchema))
}

export function saveBusinessModule<Key extends MainFlowModuleKey>(
  moduleKey: Key,
  record: MainFlowEditorDraft<Key>,
  idempotencyKey?: string,
): Promise<MainFlowDetailRecord<Key>>
export function saveBusinessModule<Key extends string>(
  moduleKey: Key,
  record: ModuleEditorDraftFor<Key>,
  idempotencyKey?: string,
): Promise<ModuleDetailRecordFor<Key>>
export async function saveBusinessModule(
  moduleKey: string,
  record: BusinessModuleSaveRecord,
  idempotencyKey?: string,
): Promise<LegacyModuleRecord> {
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
    return hasId
      ? apiPut(path, mainFlowResponseSchema, payload, requestConfig)
      : apiPost(path, mainFlowResponseSchema, payload, requestConfig)
  }

  const response = hasId
    ? await apiPut(path, rawRecordSchema, payload, requestConfig)
    : await apiPost(path, rawRecordSchema, payload, requestConfig)
  return normalizeRecord(response)
}

export function saveAndAuditBusinessModule<Key extends MainFlowModuleKey>(
  moduleKey: Key,
  record: MainFlowEditorDraft<Key>,
  idempotencyKey?: string,
): Promise<MainFlowDetailRecord<Key>>
export function saveAndAuditBusinessModule<Key extends string>(
  moduleKey: Key,
  record: ModuleEditorDraftFor<Key>,
  idempotencyKey?: string,
): Promise<ModuleDetailRecordFor<Key>>
export async function saveAndAuditBusinessModule(
  moduleKey: string,
  record: BusinessModuleSaveRecord,
  idempotencyKey?: string,
): Promise<LegacyModuleRecord> {
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
    return hasId
      ? apiPut(path, mainFlowResponseSchema, payload, requestConfig)
      : apiPost(path, mainFlowResponseSchema, payload, requestConfig)
  }

  const response = hasId
    ? await apiPut(path, rawRecordSchema, payload, requestConfig)
    : await apiPost(path, rawRecordSchema, payload, requestConfig)
  return normalizeRecord(response)
}

export async function deleteBusinessModule(moduleKey: string, id: string) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持删除')
  }

  return apiDeleteNoContent(
    `${endpointConfig.path}/${encodeURIComponent(id)}`,
    withIdempotencyKey(),
  )
}

export function updateBusinessModuleStatus<Key extends MainFlowModuleKey>(
  moduleKey: Key,
  id: string,
  status: string,
): Promise<MainFlowDetailRecord<Key>>
export function updateBusinessModuleStatus<Key extends string>(
  moduleKey: Key,
  id: string,
  status: string,
): Promise<ModuleDetailRecordFor<Key>>
export async function updateBusinessModuleStatus(
  moduleKey: string,
  id: string,
  status: string,
): Promise<LegacyModuleRecord> {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持状态变更')
  }

  const path = `${endpointConfig.path}/${encodeURIComponent(id)}/status`
  const payload = { status: parseMainFlowStatus(moduleKey, status) }
  const requestConfig = withIdempotencyKey()
  const mainFlowResponseSchema = getMainFlowDetailResponseSchema(moduleKey)
  if (mainFlowResponseSchema) {
    return apiPatch(path, mainFlowResponseSchema, payload, requestConfig)
  }

  return normalizeRecord(
    await apiPatch(path, rawRecordSchema, payload, requestConfig),
  )
}
