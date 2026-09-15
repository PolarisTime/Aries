import { parseApiContract } from '@/api/core/api-contract'
import {
  apiDeleteNoContent,
  apiGet,
  apiPatch,
  apiPost,
  apiPostNoContent,
  apiPut,
} from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import type { UserCreatePayload, UserUpdatePayload } from '@/shared/schemas'
import {
  userAccountResponseSchema,
  userCreatePayloadSchema,
  userListPageSchema,
  userPasswordResetPayloadSchema,
  userStatusUpdatePayloadSchema,
  userUpdatePayloadSchema,
} from '@/shared/schemas/user'

export interface UserListParams {
  keyword?: string
  status?: string
  page: number
  size: number
}

export function listUsers(params: UserListParams, signal?: AbortSignal) {
  return apiGet(ENDPOINTS.USERS, userListPageSchema, {
    params: {
      page: params.page,
      size: params.size,
      keyword: params.keyword || undefined,
      status: params.status || undefined,
    },
    signal,
  })
}

export function getUser(id: string, signal?: AbortSignal) {
  return apiGet(ENDPOINTS.USER(id), userAccountResponseSchema, { signal })
}

export function createUser(payload: UserCreatePayload) {
  const validatedPayload = parseApiContract(
    userCreatePayloadSchema,
    payload,
    '新增用户账号请求',
  )
  return apiPost(
    ENDPOINTS.USERS,
    userAccountResponseSchema,
    validatedPayload,
    withIdempotencyKey(),
  )
}

export function updateUser(id: string, payload: UserUpdatePayload) {
  const validatedPayload = parseApiContract(
    userUpdatePayloadSchema,
    payload,
    '更新用户账号请求',
  )
  return apiPut(
    ENDPOINTS.USER(id),
    userAccountResponseSchema,
    validatedPayload,
    withIdempotencyKey(),
  )
}

export function updateUserStatus(id: string, status: string) {
  const validatedPayload = parseApiContract(
    userStatusUpdatePayloadSchema,
    { status },
    '更新用户状态请求',
  )
  return apiPatch(
    ENDPOINTS.USER_STATUS(id),
    userAccountResponseSchema,
    validatedPayload,
    withIdempotencyKey(),
  )
}

export function resetUserPassword(id: string, newPassword: string) {
  const validatedPayload = parseApiContract(
    userPasswordResetPayloadSchema,
    { newPassword },
    '重置用户密码请求',
  )
  return apiPostNoContent(
    ENDPOINTS.USER_PASSWORD_RESETS(id),
    validatedPayload,
    withIdempotencyKey(),
  )
}

export function deleteUser(id: string) {
  return apiDeleteNoContent(ENDPOINTS.USER(id), {
    ...withIdempotencyKey(),
    suppressGlobalErrorStatuses: [403],
  })
}
