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
  mobile: z
    .string()
    .trim()
    .max(32)
    .regex(/^$|^1\d{10}$/),
  remark: z.string().trim().max(255),
})
export type CurrentAccountUpdate = z.input<typeof currentAccountUpdateSchema>

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
})
export type PasswordChange = z.input<typeof passwordChangeSchema>
