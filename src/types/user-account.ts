/** @deprecated 类型已迁移至 src/shared/schemas/user-account.ts，请从 '@/shared/schemas' 导入 */
export type {
  DepartmentOptionRecord,
  RoleOptionRecord,
  UserAccountCreateResult,
  UserAccountFormPayload,
  UserAccountRecord,
} from '@/shared/schemas'

export type UserAccountLoginNameAvailability = {
  available: boolean
  message?: string
}
