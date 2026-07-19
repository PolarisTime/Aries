import { z } from 'zod'

const userAccountRecordSchema = z.object({
  id: z.string(),
  loginName: z.string(),
  userName: z.string(),
  mobile: z.string().nullable(),
  lastLoginDate: z.string().nullable(),
  status: z.string(),
  remark: z.string().nullable(),
})
export type UserAccountRecord = z.infer<typeof userAccountRecordSchema>

export const userAccountFormPayloadSchema = z.object({
  loginName: z.string().min(1),
  password: z.string().optional(),
  userName: z.string().min(1),
  mobile: z.string(),
  status: z.string(),
  remark: z.string(),
})
export type UserAccountFormPayload = z.infer<
  typeof userAccountFormPayloadSchema
>

export const userAccountCreateResultSchema = z.object({
  user: userAccountRecordSchema,
  initialPassword: z.string(),
})
export type UserAccountCreateResult = z.infer<
  typeof userAccountCreateResultSchema
>

export type UserAccountLoginNameAvailability = {
  available: boolean
  message?: string
}
