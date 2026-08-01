import { z } from 'zod'
import { apiPost } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'

const masterDataCodeIssuanceResponseSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[1-9]\d*$/),
  })
  .strict()

/** 请求后端签发基础资料 Snowflake 编码，供新建表单只读展示并在保存时校验。 */
export async function fetchGeneratedMasterDataCode(
  moduleKey: string,
): Promise<string> {
  const response = await apiPost(
    `${ENDPOINTS.MASTER_DATA_CODE_ISSUANCES}/${encodeURIComponent(moduleKey)}`,
    masterDataCodeIssuanceResponseSchema,
  )
  return response.code
}
