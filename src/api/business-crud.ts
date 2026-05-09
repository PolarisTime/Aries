import { normalizeRecord } from '@/api/business-normalizers'
import type { NumberRuleGenerateRecord } from '@/api/business-types'
import { assertApiSuccess, http, restDelete } from '@/api/client'
import { getModuleConfig } from '@/api/module-contracts'
import { serializeBusinessRecordForSave } from '@/api/module-save-payload'
import type { ApiResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'

export async function generateBusinessPrimaryNo(moduleKey: string) {
  const response = assertApiSuccess(
    await http.post<ApiResponse<NumberRuleGenerateRecord>>(
      '/general-setting/number-rules/next',
      null,
      {
        params: { moduleKey },
      },
    ),
    '生成单号失败',
  )
  return String(response.data?.generatedNo || '')
}

export async function getBusinessModuleDetail(moduleKey: string, id: string) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持详情接口')
  }

  const response = assertApiSuccess(
    await http.get<ApiResponse<Record<string, unknown>>>(
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

  const payload = serializeBusinessRecordForSave(moduleKey, record)
  const hasId = Boolean(record.id)
  const response = assertApiSuccess(
    hasId
      ? await http.put<ApiResponse<Record<string, unknown>>>(
          `${endpointConfig.path}/${encodeURIComponent(String(record.id))}`,
          payload,
        )
      : await http.post<ApiResponse<Record<string, unknown>>>(
          endpointConfig.path,
          payload,
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

  return restDelete<ApiResponse<null>>(
    `${endpointConfig.path}/${encodeURIComponent(id)}`,
  )
}
