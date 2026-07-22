import { z } from 'zod'

export const initialSetupStatusSchema = z.object({
  setupRequired: z.boolean(),
  adminConfigured: z.boolean(),
})
export type InitialSetupStatus = z.output<typeof initialSetupStatusSchema>

const initialSetupAdminPayloadSchema = z.object({
  loginName: z.string().min(1),
  password: z.string().min(8),
  userName: z.string().min(1),
  mobile: z.string().optional(),
})
export type InitialSetupAdminPayload = z.input<
  typeof initialSetupAdminPayloadSchema
>

export type InitialSetupAdminSubmitPayload = {
  admin: InitialSetupAdminPayload
}

export type InitialSetupResult = InitialSetupStatus

export const initialSetupAdminSubmitPayloadSchema = z.object({
  admin: initialSetupAdminPayloadSchema,
})
