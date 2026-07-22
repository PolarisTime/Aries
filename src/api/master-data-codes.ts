import { ENDPOINTS } from '@/constants/endpoints'
import { stringResponseSchema } from '@/shared/schemas/api'
import { apiPost, assertApiSuccess } from './client'

/** 请求后端签发基础资料 Snowflake 编码，供新建表单只读展示并在保存时校验。 */
export async function fetchGeneratedMasterDataCode(
  moduleKey: string,
): Promise<string> {
  const response = assertApiSuccess(
    await apiPost(
      `${ENDPOINTS.MASTER_DATA_CODE_ISSUANCES}/${encodeURIComponent(moduleKey)}`,
      stringResponseSchema,
    ),
  )
  const code = String(response.data || '').trim()
  if (!code) {
    throw new Error('Master data code issuance returned an empty code')
  }
  return code
}
