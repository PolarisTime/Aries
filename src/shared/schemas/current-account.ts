import { z } from 'zod'
import { responseDateTimeSchema } from './api'

export const currentAccountSchema = z.object({
  id: z.string(),
  loginName: z.string(),
  userName: z.string(),
  mobile: z.string().nullable(),
  lastLoginDate: responseDateTimeSchema.nullable(),
  remark: z.string().nullable(),
})
export type CurrentAccount = z.output<typeof currentAccountSchema>

export const currentAccountUpdateSchema = z.object({
  userName: z.string().trim().min(1).max(64),
  /*
   * 手机号上限跟随后端与 DB 的 20：`CurrentAccountUpdateRequest.mobile` 是 @Size(max = 20)、
   * `sys_user.mobile` 是 varchar(20)（账号管理页早已是 20，这里此前停在 32 属于过期副本）。
   */
  mobile: z
    .string()
    .trim()
    .max(20)
    .regex(/^$|^1\d{10}$/),
  remark: z.string().trim().max(255),
})
export type CurrentAccountUpdate = z.input<typeof currentAccountUpdateSchema>

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
})
export type PasswordChange = z.input<typeof passwordChangeSchema>
