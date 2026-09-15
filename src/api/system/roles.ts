import { parseApiContract } from '@/api/core/api-contract'
import {
  apiDeleteNoContent,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  apiPutNoContent,
} from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import type { RoleCreatePayload, RoleUpdatePayload } from '@/shared/schemas'
import {
  roleCreatePayloadSchema,
  roleDetailResponseSchema,
  roleListPageSchema,
  rolePermissionsUpdatePayloadSchema,
  roleResponseSchema,
  roleStatusUpdatePayloadSchema,
  roleUpdatePayloadSchema,
} from '@/shared/schemas/role'

export interface RoleListParams {
  keyword?: string
  status?: string
  page: number
  size: number
}

export function listRoles(params: RoleListParams, signal?: AbortSignal) {
  return apiGet(ENDPOINTS.ROLES, roleListPageSchema, {
    params: {
      page: params.page,
      size: params.size,
      keyword: params.keyword || undefined,
      status: params.status || undefined,
    },
    signal,
  })
}

export function getRole(id: string, signal?: AbortSignal) {
  return apiGet(ENDPOINTS.ROLE(id), roleDetailResponseSchema, { signal })
}

export function createRole(payload: RoleCreatePayload) {
  const validatedPayload = parseApiContract(
    roleCreatePayloadSchema,
    payload,
    '新增角色请求',
  )
  return apiPost(
    ENDPOINTS.ROLES,
    roleResponseSchema,
    validatedPayload,
    withIdempotencyKey(),
  )
}

export function updateRole(id: string, payload: RoleUpdatePayload) {
  const validatedPayload = parseApiContract(
    roleUpdatePayloadSchema,
    payload,
    '更新角色请求',
  )
  return apiPut(
    ENDPOINTS.ROLE(id),
    roleResponseSchema,
    validatedPayload,
    withIdempotencyKey(),
  )
}

export function updateRoleStatus(id: string, status: string) {
  const validatedPayload = parseApiContract(
    roleStatusUpdatePayloadSchema,
    { status },
    '更新角色状态请求',
  )
  return apiPatch(
    ENDPOINTS.ROLE_STATUS(id),
    roleResponseSchema,
    validatedPayload,
    withIdempotencyKey(),
  )
}

export function deleteRole(id: string) {
  return apiDeleteNoContent(ENDPOINTS.ROLE(id), withIdempotencyKey())
}

export function updateRolePermissions(id: string, permissions: string[]) {
  const validatedPayload = parseApiContract(
    rolePermissionsUpdatePayloadSchema,
    { permissions },
    '保存角色权限请求',
  )
  return apiPutNoContent(
    ENDPOINTS.ROLE_PERMISSIONS(id),
    validatedPayload,
    withIdempotencyKey(),
  )
}
