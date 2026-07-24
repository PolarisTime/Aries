import { z } from 'zod'
import { responsePositiveIntegerSchema } from './api'

export const loginPayloadSchema = z.object({
  loginName: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional(),
})
export type LoginPayload = z.input<typeof loginPayloadSchema>

const loginUserSchema = z.object({
  id: z.union([z.number(), z.string()]),
  loginName: z.string(),
  userName: z.string().optional(),
})
export type LoginUser = z.output<typeof loginUserSchema>

export const loginResponseDataSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.string(),
  expiresIn: responsePositiveIntegerSchema,
  refreshExpiresIn: responsePositiveIntegerSchema.optional(),
  user: loginUserSchema,
})
export type LoginResponseData = z.output<typeof loginResponseDataSchema>

export type LoginResult = LoginResponseData
