import { z } from 'zod'

export const loginPayloadSchema = z.object({
  loginName: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
  captchaId: z.string().optional(),
  captchaCode: z.string().optional(),
})

export const login2faPayloadSchema = z.object({
  tempToken: z.string().min(1),
  totpCode: z.string().length(6, '验证码为6位数字'),
})

export const authUserSchema = z.object({
  id: z.number(),
  loginName: z.string(),
  userName: z.string(),
  status: z.string(),
  roleName: z.string().optional(),
  permissionSummary: z.string().optional(),
  departmentId: z.number().optional(),
  departmentName: z.string().optional(),
  dataScope: z.string().optional(),
  totpEnabled: z.boolean(),
})

export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.number(),
  refreshExpiresIn: z.number(),
  user: authUserSchema,
})

export const loginStep1ResponseSchema = z.object({
  step: z.literal(1),
  tempToken: z.string(),
  totpEnabled: z.boolean(),
})

export const captchaResponseSchema = z.object({
  captchaId: z.string(),
  captchaImage: z.string(),
  required: z.boolean(),
})

export type LoginPayload = z.infer<typeof loginPayloadSchema>
export type Login2faPayload = z.infer<typeof login2faPayloadSchema>
export type AuthUser = z.infer<typeof authUserSchema>
export type TokenResponse = z.infer<typeof tokenResponseSchema>
export type CaptchaResponse = z.infer<typeof captchaResponseSchema>
