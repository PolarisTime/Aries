/** @deprecated 类型已迁移至 src/shared/schemas/auth.ts，请从 '@/shared/schemas' 导入 */
export type {
  LoginPayload,
  LoginResponseData,
  LoginUser,
  ResourcePermission,
} from '@/shared/schemas'

import type { LoginResponseData } from '@/shared/schemas'

export type LoginResult = LoginResponseData
