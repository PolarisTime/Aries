import type {
  UserAccountResponse,
  UserCreatePayload,
  UserFormValues,
  UserStatus,
  UserUpdatePayload,
} from '@/shared/schemas'
import { userCreateFormSchema, userFormSchema } from '@/shared/schemas/user'

export function isUserActive(status: UserStatus): boolean {
  return status === 'NORMAL'
}

export function nextUserStatus(status: UserStatus): UserStatus {
  return status === 'NORMAL' ? 'DISABLED' : 'NORMAL'
}

export function emptyUserFormValues(): UserFormValues {
  return {
    loginName: '',
    userName: '',
    password: '',
    mobile: '',
    status: 'NORMAL',
  }
}

/** 编辑回填：密码留空，登录名只读展示。 */
export function userToFormValues(user: UserAccountResponse): UserFormValues {
  return {
    loginName: user.loginName,
    userName: user.userName,
    password: '',
    mobile: user.mobile ?? '',
    status: user.status,
  }
}

export function buildUserCreatePayload(
  values: UserFormValues,
): UserCreatePayload {
  const parsed = userCreateFormSchema.parse(values)
  return {
    loginName: parsed.loginName,
    userName: parsed.userName,
    password: parsed.password,
    mobile: parsed.mobile || undefined,
    status: parsed.status,
  }
}

export function buildUserUpdatePayload(
  values: UserFormValues,
): UserUpdatePayload {
  const parsed = userFormSchema.parse(values)
  return {
    userName: parsed.userName,
    mobile: parsed.mobile || undefined,
    status: parsed.status,
  }
}
