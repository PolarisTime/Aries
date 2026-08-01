import { parseApiContract } from '@/api/core/api-contract'
import { apiPostNoContent } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { InitialSetupAccountSubmitPayload } from '@/shared/schemas'
import { initialSetupAccountSubmitPayloadSchema } from '@/shared/schemas/setup'

function setupTokenHeaders(setupToken: string) {
  return { headers: { 'X-Setup-Token': setupToken } }
}

export async function submitInitialAccount(
  payload: InitialSetupAccountSubmitPayload,
  setupToken: string,
) {
  const validatedPayload = parseApiContract(
    initialSetupAccountSubmitPayloadSchema,
    payload,
    '初始化账号请求',
  )
  await apiPostNoContent(
    ENDPOINTS.SETUP_ACCOUNT,
    validatedPayload,
    setupTokenHeaders(setupToken),
  )
}
