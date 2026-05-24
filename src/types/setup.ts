/** @deprecated 类型已迁移至 src/shared/schemas/setup.ts，请从 '@/shared/schemas' 导入 */
export type {
  InitialSetupCompanyPayload,
  InitialSetupStatus,
  InitialSetupTotpPayload,
  InitialSetupTotpResult,
} from '@/shared/schemas'

import type {
  InitialSetupAdminPayload,
  InitialSetupCompanyPayload,
  InitialSetupStatus,
} from '@/shared/schemas'

export type InitialSetupAdminSubmitPayload = {
  admin: InitialSetupAdminPayload
  totpSecret?: string
  totpCode?: string
}

export type InitialSetupPayload = {
  admin?: InitialSetupAdminSubmitPayload
  company?: InitialSetupCompanyPayload
}

export type InitialSetupResult = InitialSetupStatus
