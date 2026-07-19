import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import { assertApiSuccess, http } from './client'

/** 请求后端签发基础资料 Snowflake 编码，供新建表单只读展示并在保存时校验。 */
export async function fetchGeneratedMasterDataCode(
  moduleKey: string,
): Promise<string> {
  const response = assertApiSuccess(
    await http.post<ApiResponse<string>>(
      `${ENDPOINTS.MASTER_DATA_CODE_ISSUANCES}/${encodeURIComponent(moduleKey)}`,
    ),
  )
  const code = String(response.data || '').trim()
  if (!code) {
    throw new Error('Master data code issuance returned an empty code')
  }
  return code
}
