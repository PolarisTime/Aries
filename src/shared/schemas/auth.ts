import { z } from 'zod'

const loginPayloadSchema = z.object({
  loginName: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional(),
  captchaId: z.string().optional(),
  captchaCode: z.string().optional(),
})
export type LoginPayload = z.infer<typeof loginPayloadSchema>

const captchaDataSchema = z.object({
  captchaId: z.string(),
  captchaImage: z.string(),
  required: z.boolean(),
})
export type CaptchaData = z.infer<typeof captchaDataSchema>

const login2faPayloadSchema = z.object({
  tempToken: z.string(),
  totpCode: z.string().length(6),
  remember: z.boolean().optional(),
})
export type Login2faPayload = z.infer<typeof login2faPayloadSchema>

const resourcePermissionSchema = z.object({
  resource: z.string(),
  actions: z.array(z.string()),
})
export type ResourcePermission = z.infer<typeof resourcePermissionSchema>

const dataScopeSchema = z.enum(['all', 'department', 'self', 'custom'])
export type DataScope = z.infer<typeof dataScopeSchema>

const loginUserSchema = z.object({
  id: z.union([z.number(), z.string()]),
  loginName: z.string(),
  userName: z.string().optional(),
  roleName: z.string().optional(),
  totpEnabled: z.boolean().optional(),
  forceTotpSetup: z.boolean().optional(),
  permissions: z.array(resourcePermissionSchema).optional(),
  dataScopes: z.record(z.string(), z.string()).optional(),
})
export type LoginUser = z.infer<typeof loginUserSchema>

const loginResponseDataSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.number(),
  refreshExpiresIn: z.number().optional(),
  user: loginUserSchema,
})
export type LoginResponseData = z.infer<typeof loginResponseDataSchema>

const loginStep1ResponseSchema = z.object({
  requires2fa: z.boolean(),
  tempToken: z.string(),
})
export type LoginStep1Response = z.infer<typeof loginStep1ResponseSchema>

const totpSetupResponseSchema = z.object({
  qrCodeBase64: z.string(),
  secret: z.string(),
})
export type TotpSetupResponse = z.infer<typeof totpSetupResponseSchema>
