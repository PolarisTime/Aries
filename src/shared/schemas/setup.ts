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

export const initialSetupTotpPayloadSchema = z.object({
  loginName: z.string(),
})
export type InitialSetupTotpPayload = z.infer<
  typeof initialSetupTotpPayloadSchema
>

export const initialSetupTotpResultSchema = z.object({
  qrCodeBase64: z.string(),
  secret: z.string(),
})
export type InitialSetupTotpResult = z.infer<
  typeof initialSetupTotpResultSchema
>

export const initialSetupCompanyPayloadSchema = z.object({
  companyName: z.string().min(1),
  taxNo: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  taxRate: z.union([z.string(), z.number()]).optional(),
  remark: z.string().optional(),
})
export type InitialSetupCompanyPayload = z.infer<
  typeof initialSetupCompanyPayloadSchema
>

export type InitialSetupAdminSubmitPayload = {
  admin: InitialSetupAdminPayload
  totpSecret?: string
  totpCode?: string
}

export type InitialSetupResult = InitialSetupStatus

export interface InitialSetupSubmitResponse {
  adminLoginName: string
  companyName: string
}
