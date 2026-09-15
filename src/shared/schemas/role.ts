import { z } from 'zod'
import {
  exactPageSchema,
  requestEntityIdSchema,
  responseEntityIdSchema,
  responseNonNegativeIntegerSchema,
} from './api'

/** 角色状态：契约只允许“正常 / 禁用”。 */
export const roleStatusSchema = z.enum(['正常', '禁用'])
export type RoleStatus = z.output<typeof roleStatusSchema>

const roleCodeSchema = z.string().trim().min(1).max(64)
const roleNameSchema = z.string().trim().min(1).max(64)
const roleDescriptionSchema = z.string().trim().max(255)

export const roleResponseSchema = z.object({
  id: responseEntityIdSchema,
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  builtin: z.boolean(),
  status: roleStatusSchema,
  permissionCount: responseNonNegativeIntegerSchema,
  userCount: responseNonNegativeIntegerSchema,
})
export type RoleResponse = z.output<typeof roleResponseSchema>

export const roleDetailResponseSchema = roleResponseSchema.extend({
  permissions: z.array(z.string()),
})
export type RoleDetailResponse = z.output<typeof roleDetailResponseSchema>

/** 权限目录项：resource 分组，action 细动作，field 为可选字段级。 */
export const permissionSchema = z.object({
  code: z.string().min(1),
  resource: z.string().min(1),
  action: z.string().min(1),
  field: z.string().nullish(),
  description: z.string().nullish(),
})
export type Permission = z.output<typeof permissionSchema>

export const roleListPageSchema = exactPageSchema(roleResponseSchema)
export type RoleListPage = z.output<typeof roleListPageSchema>

export const roleCreatePayloadSchema = z.object({
  code: roleCodeSchema,
  name: roleNameSchema,
  description: roleDescriptionSchema.optional(),
})
export type RoleCreatePayload = z.input<typeof roleCreatePayloadSchema>

/** 更新角色：code 仅在非内置角色时允许提交，内置角色省略。 */
export const roleUpdatePayloadSchema = z.object({
  code: roleCodeSchema.optional(),
  name: roleNameSchema,
  description: roleDescriptionSchema.optional(),
})
export type RoleUpdatePayload = z.input<typeof roleUpdatePayloadSchema>

export const roleStatusUpdatePayloadSchema = z.object({
  status: roleStatusSchema,
})
export type RoleStatusUpdatePayload = z.input<
  typeof roleStatusUpdatePayloadSchema
>

export const rolePermissionsUpdatePayloadSchema = z.object({
  permissions: z.array(z.string()),
})
export type RolePermissionsUpdatePayload = z.input<
  typeof rolePermissionsUpdatePayloadSchema
>

export const userRolesUpdatePayloadSchema = z.object({
  roleIds: z.array(requestEntityIdSchema),
})
export type UserRolesUpdatePayload = z.input<
  typeof userRolesUpdatePayloadSchema
>

/** 角色表单校验：新增/编辑共用，内置角色由 UI 置灰 code。 */
export const roleFormSchema = z.object({
  code: roleCodeSchema,
  name: roleNameSchema,
  description: roleDescriptionSchema.optional(),
})
export type RoleFormValues = z.input<typeof roleFormSchema>

export const userRolesResponseSchema = z.array(requestEntityIdSchema)
