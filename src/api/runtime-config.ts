import { assertApiSuccess, http } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type { RuntimeConfigResponse } from '@/types/runtime-config'

const RUNTIME_CONFIG_ENDPOINT = '/runtime-config'

export async function getRuntimeConfig(): Promise<RuntimeConfigResponse> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<RuntimeConfigResponse>>(RUNTIME_CONFIG_ENDPOINT),
    '加载运行时配置失败',
  )
  return response.data
}
