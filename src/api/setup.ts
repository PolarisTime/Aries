import { ENDPOINTS } from '@/constants/endpoints'
import type { InitialSetupAccountSubmitPayload } from '@/shared/schemas'
import { apiResponseSchema, stringResponseSchema } from '@/shared/schemas/api'
import {
  initialSetupAccountSubmitPayloadSchema,
  initialSetupStatusSchema,
} from '@/shared/schemas/setup'
import { getApiMessage } from '@/utils/api-messages'
import { parseApiContract } from './api-contract'
import { apiGet, apiPost, assertApiSuccess } from './client'

const initialSetupStatusResponseSchema = apiResponseSchema(
  initialSetupStatusSchema,
)

function setupTokenHeaders(setupToken: string) {
  return { headers: { 'X-Setup-Token': setupToken } }
}

export async function getInitialSetupStatus() {
  const response = await apiGet(
    ENDPOINTS.SETUP_STATUS,
    initialSetupStatusResponseSchema,
  )
  return assertApiSuccess(response, getApiMessage('getInitStatusFailed'))
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
  const response = await apiPost(
    ENDPOINTS.SETUP_ACCOUNT,
    stringResponseSchema,
    validatedPayload,
    setupTokenHeaders(setupToken),
  )
  return assertApiSuccess(response, getApiMessage('accountInitFailed'))
}
