import { z } from 'zod'

export const initialSetupStatusSchema = z.object({
  setupRequired: z.boolean(),
  adminConfigured: z.boolean(),
})
export type InitialSetupStatus = z.infer<typeof initialSetupStatusSchema>

export const initialSetupAdminPayloadSchema = z.object({
  loginName: z.string().min(1),
  password: z.string().min(8),
  userName: z.string().min(1),
  mobile: z.string().optional(),
})
export type InitialSetupAdminPayload = z.infer<
  typeof initialSetupAdminPayloadSchema
>

export type InitialSetupAdminSubmitPayload = {
  admin: InitialSetupAdminPayload
}

export type InitialSetupResult = InitialSetupStatus
