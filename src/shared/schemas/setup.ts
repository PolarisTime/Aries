import { z } from 'zod'

export const initialSetupStatusSchema = z.object({
  setupRequired: z.boolean(),
  adminConfigured: z.boolean(),
  companyConfigured: z.boolean(),
})
export type InitialSetupStatus = z.infer<typeof initialSetupStatusSchema>

export const initialSetupAdminPayloadSchema = z.object({
  loginName: z.string().min(1),
  password: z.string().min(6),
  userName: z.string().min(1),
  mobile: z.string().optional(),
})
export type InitialSetupAdminPayload = z.infer<
  typeof initialSetupAdminPayloadSchema
>

export const initialSetupCompanyPayloadSchema = z.object({
  companyName: z.string().min(1),
  taxNo: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  remark: z.string().optional(),
})
export type InitialSetupCompanyPayload = z.infer<
  typeof initialSetupCompanyPayloadSchema
>

export type InitialSetupAdminSubmitPayload = {
  admin: InitialSetupAdminPayload
}

export type InitialSetupResult = InitialSetupStatus

export interface InitialSetupSubmitResponse {
  adminLoginName: string
  companyName: string
}
