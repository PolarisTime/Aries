/** @deprecated 类型已迁移至 src/shared/schemas/setup.ts，请从 '@/shared/schemas' 导入 */
export type {
  InitialSetupAdminPayload,
  InitialSetupCompanyPayload,
  InitialSetupStatus,
  InitialSetupTotpPayload,
  InitialSetupTotpResult,
} from '@/shared/schemas'

import type {
  InitialSetupAdminPayload,
  InitialSetupStatus,
} from '@/shared/schemas'

export type InitialSetupAdminSubmitPayload = {
  admin: InitialSetupAdminPayload
  totpSecret?: string
  totpCode?: string
}

export type InitialSetupResult = InitialSetupStatus

export interface InitialSetupSubmitResponse {
  adminLoginName: string
  companyName: string
}
