import { z } from 'zod'

const userAccountRecordSchema = z.object({
  id: z.string(),
  loginName: z.string(),
  userName: z.string(),
  mobile: z.string().nullable(),
  departmentId: z.string().nullable(),
  departmentName: z.string().nullable(),
  roleNames: z.array(z.string()),
  roleIds: z.array(z.union([z.string(), z.number()])).optional(),
  permissionSummary: z.string().nullable(),
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
  departmentId: z.string().nullable().optional(),
  roleIds: z.array(z.string()),
  permissionSummary: z.string(),
  status: z.string(),
  remark: z.string(),
})
export type UserAccountFormPayload = z.infer<
  typeof userAccountFormPayloadSchema
>

export const userAccountCreateResultSchema = z.object({
  user: userAccountRecordSchema.optional(),
  loginName: z.string(),
  initialPassword: z.string().optional(),
  password: z.string(),
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

export const roleOptionRecordSchema = z.object({
  id: z.union([z.string(), z.number()]),
  roleName: z.string(),
  roleCode: z.string(),
  status: z.string().optional(),
  permissionSummary: z.string().optional(),
})
export type RoleOptionRecord = z.infer<typeof roleOptionRecordSchema>
