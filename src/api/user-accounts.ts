import { parseApiContract } from '@/api/api-contract'
import { pageContent } from '@/api/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import type { UserAccountFormPayload } from '@/shared/schemas'
import {
  apiResponseSchema,
  nullResponseSchema,
  rawPageSchema,
} from '@/shared/schemas/api'
import {
  userAccountCreateResultSchema,
  userAccountFormPayloadSchema,
  userAccountLoginNameAvailabilitySchema,
  userAccountRecordSchema,
} from '@/shared/schemas/user-account'
import { getApiMessage } from '@/utils/api-messages'
import { apiDelete, apiGet, apiPost, apiPut, assertApiSuccess } from './client'

const userAccountResponseSchema = apiResponseSchema(userAccountRecordSchema)
const userAccountPageResponseSchema = apiResponseSchema(
  rawPageSchema(userAccountRecordSchema),
)
const loginNameAvailabilityResponseSchema = apiResponseSchema(
  userAccountLoginNameAvailabilitySchema,
)
const userAccountCreateResponseSchema = apiResponseSchema(
  userAccountCreateResultSchema,
)

export interface UserAccountListParams {
  page: number
  size: number
  keyword?: string
  status?: string
}

function buildUserAccountUrl(id?: string) {
  return id != null
    ? `${ENDPOINTS.USER_ACCOUNTS}/${id}`
    : ENDPOINTS.USER_ACCOUNTS
}

export async function listUserAccounts(params: UserAccountListParams) {
  const response = await apiGet(
    ENDPOINTS.USER_ACCOUNTS,
    userAccountPageResponseSchema,
    { params },
  )
  const data = assertApiSuccess(response, getApiMessage('loadUsersFailed')).data
  return { ...data, records: pageContent(data) }
}

export async function getUserAccountDetail(id: string, signal?: AbortSignal) {
  const response = signal
    ? await apiGet(buildUserAccountUrl(id), userAccountResponseSchema, {
        signal,
      })
    : await apiGet(buildUserAccountUrl(id), userAccountResponseSchema)
  return assertApiSuccess(response, getApiMessage('loadUserDetailFailed')).data
}

export async function checkUserAccountLoginName(
  loginName: string,
  excludeUserId?: string,
) {
  const response = await apiGet(
    ENDPOINTS.USER_ACCOUNTS_LOGIN_NAME_CHECK,
    loginNameAvailabilityResponseSchema,
    {
      params: { loginName, excludeUserId },
    },
  )
  return assertApiSuccess(response, getApiMessage('checkLoginNameFailed')).data
}

export async function createUserAccount(payload: UserAccountFormPayload) {
  const validatedPayload = parseApiContract(
    userAccountFormPayloadSchema,
    payload,
    '创建账号请求',
  )
  const response = await apiPost(
    ENDPOINTS.USER_ACCOUNTS,
    userAccountCreateResponseSchema,
    validatedPayload,
  )
  return assertApiSuccess(response, getApiMessage('createUserFailed'))
}

export async function updateUserAccount(
  id: string,
  payload: UserAccountFormPayload,
) {
  const validatedPayload = parseApiContract(
    userAccountFormPayloadSchema,
    payload,
    '更新账号请求',
  )
  const response = await apiPut(
    buildUserAccountUrl(id),
    userAccountResponseSchema,
    validatedPayload,
  )
  return assertApiSuccess(response, getApiMessage('saveUserFailed'))
}

export async function deleteUserAccount(id: string) {
  const response = await apiDelete(buildUserAccountUrl(id), nullResponseSchema)
  return assertApiSuccess(response, getApiMessage('deleteUserFailed'))
}
