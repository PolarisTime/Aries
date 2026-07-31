import { parseApiContract } from '@/api/core/api-contract'
import { apiGet, apiPut, apiPutNoContent } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type {
  CurrentAccountUpdate,
  PasswordChange,
} from '@/shared/schemas/current-account'
import {
  currentAccountSchema,
  currentAccountUpdateSchema,
  passwordChangeSchema,
} from '@/shared/schemas/current-account'

const currentAccountResponseSchema = currentAccountSchema

export async function getCurrentAccount() {
  return apiGet(ENDPOINTS.ACCOUNT, currentAccountResponseSchema)
}

export async function updateCurrentAccount(payload: CurrentAccountUpdate) {
  const validatedPayload = parseApiContract(
    currentAccountUpdateSchema,
    payload,
    '更新当前账号资料请求',
  )
  return apiPut(
    ENDPOINTS.ACCOUNT,
    currentAccountResponseSchema,
    validatedPayload,
  )
}

export async function changeCurrentAccountPassword(payload: PasswordChange) {
  const validatedPayload = parseApiContract(
    passwordChangeSchema,
    payload,
    '修改当前账号密码请求',
  )
  return apiPutNoContent(ENDPOINTS.ACCOUNT_PASSWORD, validatedPayload)
}
