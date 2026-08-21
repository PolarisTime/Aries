import { parseApiContract } from '@/api/core/api-contract'
import { apiPost } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { InitialSetupAccountSubmitPayload } from '@/shared/schemas'
import {
  initialSetupAccountCreatedSchema,
  initialSetupAccountSubmitPayloadSchema,
} from '@/shared/schemas/setup'

function setupTokenHeaders(setupToken: string) {
  return { headers: { 'X-Setup-Token': setupToken } }
}

/** 初始化账号：后端返回 201 Created 与脱敏账号摘要（id/loginName/userName）。 */
export async function submitInitialAccount(
  payload: InitialSetupAccountSubmitPayload,
  setupToken: string,
): Promise<void> {
  const validatedPayload = parseApiContract(
    initialSetupAccountSubmitPayloadSchema,
    payload,
    '初始化账号请求',
  )
  await apiPost(
    ENDPOINTS.SETUP_ACCOUNT,
    initialSetupAccountCreatedSchema,
    validatedPayload,
    setupTokenHeaders(setupToken),
  )
}
