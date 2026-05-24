/** @deprecated 类型已迁移至 src/shared/schemas/auth.ts，请从 '@/shared/schemas' 导入 */
export type {
  CaptchaData,
  Login2faPayload,
  LoginPayload,
  LoginResponseData,
  LoginUser,
  ResourcePermission,
  TotpSetupResponse,
} from '@/shared/schemas'

import type { LoginResponseData, LoginStep1Response } from '@/shared/schemas'

export type LoginResult = LoginResponseData | LoginStep1Response
