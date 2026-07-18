import { z } from 'zod'

const userAccountRecordSchema = z.object({
  id: z.string(),
  loginName: z.string(),
  userName: z.string(),
  mobile: z.string().nullable(),
  departmentId: z.string().nullable(),
  departmentName: z.string().nullable(),
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
  departmentId: z.string(),
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

export const departmentOptionRecordSchema = z.object({
  id: z.union([z.string(), z.number()]),
  departmentCode: z.string().optional(),
  departmentName: z.string(),
})
export type DepartmentOptionRecord = z.infer<
  typeof departmentOptionRecordSchema
>
