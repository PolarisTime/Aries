/** @deprecated 类型已迁移至 src/shared/schemas/auth.ts，请从 '@/shared/schemas' 导入 */
export type {
  CaptchaData,
  DataScope,
  Login2faPayload,
  LoginPayload,
  LoginResponseData,
  LoginStep1Response,
  LoginUser,
  ResourcePermission,
  TotpSetupResponse,
} from '@/shared/schemas'

import type { LoginResponseData, LoginStep1Response } from '@/shared/schemas'

export type LoginResult = LoginResponseData | LoginStep1Response
