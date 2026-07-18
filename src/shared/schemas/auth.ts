import { z } from 'zod'

export const loginPayloadSchema = z.object({
  loginName: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional(),
})
export type LoginPayload = z.infer<typeof loginPayloadSchema>

const loginUserSchema = z.object({
  id: z.union([z.number(), z.string()]),
  loginName: z.string(),
  userName: z.string().optional(),
})
export type LoginUser = z.infer<typeof loginUserSchema>

export const loginResponseDataSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.number(),
  refreshExpiresIn: z.number().optional(),
  user: loginUserSchema,
})
export type LoginResponseData = z.infer<typeof loginResponseDataSchema>

export type LoginResult = LoginResponseData
