import { z } from 'zod'

export const userAccountRecordSchema = z.object({
  id: z.string(),
  loginName: z.string(),
  userName: z.string(),
  mobile: z.string().nullable(),
  lastLoginDate: z.string().nullable(),
  status: z.string(),
  remark: z.string().nullable(),
})
export type UserAccountRecord = z.output<typeof userAccountRecordSchema>

export const userAccountFormPayloadSchema = z.object({
  loginName: z.string().min(1),
  password: z.string().optional(),
  userName: z.string().min(1),
  mobile: z.string(),
  status: z.string(),
  remark: z.string(),
})
export type UserAccountFormPayload = z.input<
  typeof userAccountFormPayloadSchema
>

export const userAccountCreateResultSchema = z.object({
  user: userAccountRecordSchema,
  initialPassword: z.string(),
})
export type UserAccountCreateResult = z.output<
  typeof userAccountCreateResultSchema
>

export const userAccountLoginNameAvailabilitySchema = z.object({
  available: z.boolean(),
  message: z.string().optional(),
})
export type UserAccountLoginNameAvailability = z.output<
  typeof userAccountLoginNameAvailabilitySchema
>
