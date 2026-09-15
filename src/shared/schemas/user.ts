import { z } from 'zod'
import { exactPageSchema, responseEntityIdSchema } from './api'

/** 后端用户账号状态枚举：NORMAL 启用 / DISABLED 停用。 */
export const userStatusSchema = z.enum(['NORMAL', 'DISABLED'])
export type UserStatus = z.output<typeof userStatusSchema>

const loginNameSchema = z
  .string()
  .trim()
  .min(1, '登录账号不能为空')
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.@-]*$/, '登录账号格式不正确')

const userNameSchema = z.string().trim().min(1, '姓名不能为空').max(64)

const mobileSchema = z
  .string()
  .trim()
  .max(20)
  .regex(/^$|^1\d{10}$/, '手机号格式不正确')

/** 密码强度：8~128 位且同时包含字母与数字。 */
export const userPasswordSchema = z
  .string()
  .min(8, '密码至少8位')
  .max(128)
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, '密码需同时包含字母和数字')

export const userAccountResponseSchema = z.object({
  id: responseEntityIdSchema,
  loginName: z.string(),
  userName: z.string(),
  mobile: z.string().nullish(),
  status: userStatusSchema,
  lastLoginDate: z.string().nullish(),
  remark: z.string().nullish(),
})
export type UserAccountResponse = z.output<typeof userAccountResponseSchema>

export const userListPageSchema = exactPageSchema(userAccountResponseSchema)
export type UserListPage = z.output<typeof userListPageSchema>

export const userCreatePayloadSchema = z.object({
  loginName: loginNameSchema,
  userName: userNameSchema,
  password: userPasswordSchema,
  mobile: mobileSchema.optional(),
  status: userStatusSchema.optional(),
})
export type UserCreatePayload = z.input<typeof userCreatePayloadSchema>

/** 编辑账号不含密码，密码通过 password-resets 资源单独重置。 */
export const userUpdatePayloadSchema = z.object({
  userName: userNameSchema,
  mobile: mobileSchema.optional(),
  status: userStatusSchema.optional(),
})
export type UserUpdatePayload = z.input<typeof userUpdatePayloadSchema>

export const userStatusUpdatePayloadSchema = z.object({
  status: userStatusSchema,
})
export type UserStatusUpdatePayload = z.input<
  typeof userStatusUpdatePayloadSchema
>

export const userPasswordResetPayloadSchema = z.object({
  newPassword: userPasswordSchema,
})
export type UserPasswordResetPayload = z.input<
  typeof userPasswordResetPayloadSchema
>

/** 用户表单：新增必填密码，编辑时密码留空。 */
export const userFormSchema = z.object({
  loginName: loginNameSchema,
  userName: userNameSchema,
  mobile: z.string().trim().optional(),
  status: userStatusSchema,
  password: z.string().optional(),
})
export type UserFormValues = z.input<typeof userFormSchema>

export const userCreateFormSchema = userFormSchema.extend({
  password: userPasswordSchema,
})
