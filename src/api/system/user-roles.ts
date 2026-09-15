import { parseApiContract } from '@/api/core/api-contract'
import { apiGet, apiPutNoContent } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import {
  userRolesResponseSchema,
  userRolesUpdatePayloadSchema,
} from '@/shared/schemas/role'

export function getUserRoles(id: string, signal?: AbortSignal) {
  return apiGet(ENDPOINTS.USER_ROLES(id), userRolesResponseSchema, { signal })
}

export function updateUserRoles(id: string, roleIds: string[]) {
  const validatedPayload = parseApiContract(
    userRolesUpdatePayloadSchema,
    { roleIds },
    '保存用户角色请求',
  )
  return apiPutNoContent(
    ENDPOINTS.USER_ROLES(id),
    validatedPayload,
    withIdempotencyKey(),
  )
}
