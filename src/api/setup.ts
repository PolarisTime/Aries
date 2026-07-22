import { ENDPOINTS } from '@/constants/endpoints'
import type { InitialSetupAdminSubmitPayload } from '@/shared/schemas'
import { apiResponseSchema, stringResponseSchema } from '@/shared/schemas/api'
import {
  initialSetupAdminSubmitPayloadSchema,
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

export async function submitInitialAdmin(
  payload: InitialSetupAdminSubmitPayload,
  setupToken: string,
) {
  const validatedPayload = parseApiContract(
    initialSetupAdminSubmitPayloadSchema,
    payload,
    '初始化管理员请求',
  )
  const response = await apiPost(
    ENDPOINTS.SETUP_ADMIN,
    stringResponseSchema,
    validatedPayload,
    setupTokenHeaders(setupToken),
  )
  return assertApiSuccess(response, getApiMessage('adminAccountInitFailed'))
}
