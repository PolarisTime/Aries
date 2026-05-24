import { z } from 'zod'

const userAccountRecordSchema = z.object({
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

const userAccountFormPayloadSchema = z.object({
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
export type UserAccountFormPayload = z.infer<
  typeof userAccountFormPayloadSchema
>

const userAccountCreateResultSchema = z.object({
  user: userAccountRecordSchema.optional(),
  loginName: z.string(),
  initialPassword: z.string().optional(),
  password: z.string(),
  totpSetup: z
    .object({
      qrCodeBase64: z.string(),
      secret: z.string(),
    })
    .optional(),
})
export type UserAccountCreateResult = z.infer<
  typeof userAccountCreateResultSchema
>

const departmentOptionRecordSchema = z.object({
  id: z.union([z.string(), z.number()]),
  departmentCode: z.string().optional(),
  departmentName: z.string(),
})
export type DepartmentOptionRecord = z.infer<
  typeof departmentOptionRecordSchema
>

const roleOptionRecordSchema = z.object({
  id: z.union([z.string(), z.number()]),
  roleName: z.string(),
  roleCode: z.string(),
  status: z.string().optional(),
  dataScope: z.string().optional(),
  permissionSummary: z.string().optional(),
})
export type RoleOptionRecord = z.infer<typeof roleOptionRecordSchema>
