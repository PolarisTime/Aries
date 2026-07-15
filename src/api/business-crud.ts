import { normalizeRecord } from '@/api/business-normalizers'
import type { NumberRuleGenerateRecord } from '@/api/business-types'
import { assertApiSuccess, http } from '@/api/client'
import { withIdempotencyKey } from '@/api/idempotency'
import { getModuleConfig } from '@/api/module-contracts'
import { serializeBusinessRecordForSave } from '@/api/module-save-payload'
import type { ApiResponse } from '@/types/api'
import type { RawApiRecord } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'

export async function generateBusinessPrimaryNo(moduleKey: string) {
  const response = assertApiSuccess(
    await http.post<ApiResponse<NumberRuleGenerateRecord>>(
      '/general-settings/number-rule/next',
      null,
      {
        params: { moduleKey },
      },
    ),
    '生成单号失败',
  )
  const generatedNo = String(response.data?.generatedNo || '').trim()
  if (!generatedNo) {
    throw new Error(`模块 ${moduleKey} 未配置可用编号规则`)
  }
  return generatedNo
}

export async function allocateBusinessPrimaryNo(moduleKey: string) {
  const response = assertApiSuccess(
    await http.post<ApiResponse<NumberRuleGenerateRecord>>(
      '/general-settings/number-rule/next',
      null,
      {
        params: { moduleKey },
      },
    ),
    '预分配单据号失败',
  )
  const generatedNo = String(response.data?.generatedNo || '').trim()
  const generatedId = String(response.data?.generatedId || '').trim()
  if (!generatedNo) {
    throw new Error(`模块 ${moduleKey} 未配置可用编号规则`)
  }
  return { generatedNo, generatedId }
}

export async function getBusinessModuleDetail(moduleKey: string, id: string) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly && !endpointConfig.supportsDetail) {
    throw new Error('当前模块不支持详情接口')
  }

  const response = assertApiSuccess(
    await http.get<ApiResponse<RawApiRecord>>(
      `${endpointConfig.path}/${encodeURIComponent(id)}`,
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
) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持保存')
  }

  const payload = await serializeBusinessRecordForSave(moduleKey, record)
  const preallocatedId =
    typeof record._preallocatedId === 'string'
      ? record._preallocatedId.trim()
      : ''
  const hasId = Boolean(record.id)
  const response = assertApiSuccess(
    hasId
      ? await http.put<ApiResponse<RawApiRecord>>(
          `${endpointConfig.path}/${encodeURIComponent(String(record.id))}`,
          payload,
          withIdempotencyKey(),
        )
      : await http.post<ApiResponse<RawApiRecord>>(
          endpointConfig.path,
          payload,
          withIdempotencyKey(
            preallocatedId
              ? {
                  headers: {
                    'X-Business-Module-Key': moduleKey,
                    'X-Preallocated-Id': preallocatedId,
                  },
                }
              : undefined,
          ),
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
) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持保存并审核')
  }

  const payload = await serializeBusinessRecordForSave(moduleKey, record)
  const preallocatedId =
    typeof record._preallocatedId === 'string'
      ? record._preallocatedId.trim()
      : ''
  const hasId = Boolean(record.id)
  const response = assertApiSuccess(
    hasId
      ? await http.put<ApiResponse<RawApiRecord>>(
          `${endpointConfig.path}/${encodeURIComponent(String(record.id))}/save-and-audit`,
          payload,
          withIdempotencyKey(),
        )
      : await http.post<ApiResponse<RawApiRecord>>(
          `${endpointConfig.path}/save-and-audit`,
          payload,
          withIdempotencyKey(
            preallocatedId
              ? {
                  headers: {
                    'X-Business-Module-Key': moduleKey,
                    'X-Preallocated-Id': preallocatedId,
                  },
                }
              : undefined,
          ),
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

  return http.delete<ApiResponse<null>>(
    `${endpointConfig.path}/${encodeURIComponent(id)}`,
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
    await http.patch<ApiResponse<RawApiRecord>>(
      `${endpointConfig.path}/${encodeURIComponent(id)}/status`,
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
