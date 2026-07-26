import { parseApiContract } from '@/api/core/api-contract'
import { apiGet, apiPut, assertApiSuccess } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { apiResponseSchema, nullResponseSchema } from '@/shared/schemas/api'
import type {
  CurrentAccountUpdate,
  PasswordChange,
} from '@/shared/schemas/current-account'
import {
  currentAccountSchema,
  currentAccountUpdateSchema,
  passwordChangeSchema,
} from '@/shared/schemas/current-account'
import { getApiMessage } from '@/utils/api-messages'

const currentAccountResponseSchema = apiResponseSchema(currentAccountSchema)

export async function getCurrentAccount() {
  const response = await apiGet(ENDPOINTS.ACCOUNT, currentAccountResponseSchema)
  return assertApiSuccess(response, getApiMessage('loadCurrentAccountFailed'))
    .data
}

export async function updateCurrentAccount(payload: CurrentAccountUpdate) {
  const validatedPayload = parseApiContract(
    currentAccountUpdateSchema,
    payload,
    '更新当前账号资料请求',
  )
  const response = await apiPut(
    ENDPOINTS.ACCOUNT,
    currentAccountResponseSchema,
    validatedPayload,
  )
  return assertApiSuccess(response, getApiMessage('saveCurrentAccountFailed'))
    .data
}

export async function changeCurrentAccountPassword(payload: PasswordChange) {
  const validatedPayload = parseApiContract(
    passwordChangeSchema,
    payload,
    '修改当前账号密码请求',
  )
  const response = await apiPut(
    ENDPOINTS.ACCOUNT_PASSWORD,
    nullResponseSchema,
    validatedPayload,
  )
  return assertApiSuccess(response, getApiMessage('requestFailed'))
}
