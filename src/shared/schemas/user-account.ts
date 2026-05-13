import { z } from 'zod'

export const userAccountRecordSchema = z.object({
  id: z.string(),
  loginName: z.string(),
  userName: z.string(),
  mobile: z.string().nullable(),
  departmentId: z.string().nullable(),
  departmentName: z.string().nullable(),
  roleNames: z.array(z.string()),
  dataScope: z.string().nullable(),
  permissionSummary: z.string().nullable(),
  lastLoginDate: z.string().nullable(),
  status: z.string(),
  remark: z.string().nullable(),
  totpEnabled: z.boolean(),
})
export type UserAccountRecord = z.infer<typeof userAccountRecordSchema>

export const userAccountFormPayloadSchema = z.object({
  loginName: z.string().min(1),
  password: z.string().optional(),
  userName: z.string().min(1),
  mobile: z.string(),
  departmentId: z.string().nullable().optional(),
  roleNames: z.array(z.string()),
  dataScope: z.string(),
  permissionSummary: z.string(),
  status: z.string(),
  remark: z.string(),
})
export type UserAccountFormPayload = z.infer<typeof userAccountFormPayloadSchema>

export const userAccountCreateResultSchema = z.object({
  loginName: z.string(),
  password: z.string(),
  totpSetup: z
    .object({
      qrCodeBase64: z.string(),
      secret: z.string(),
    })
    .optional(),
})
export type UserAccountCreateResult = z.infer<typeof userAccountCreateResultSchema>

export const departmentOptionRecordSchema = z.object({
  id: z.union([z.string(), z.number()]),
  departmentName: z.string(),
})
export type DepartmentOptionRecord = z.infer<typeof departmentOptionRecordSchema>

export const roleOptionRecordSchema = z.object({
  id: z.union([z.string(), z.number()]),
  roleName: z.string(),
  roleCode: z.string(),
  status: z.string().optional(),
})
export type RoleOptionRecord = z.infer<typeof roleOptionRecordSchema>
