import { describe, expect, it } from 'vitest'
import type { UserAccountResponse } from '@/shared/schemas'
import {
  buildUserCreatePayload,
  buildUserUpdatePayload,
  emptyUserFormValues,
  isUserActive,
  nextUserStatus,
  userToFormValues,
} from './user-account-form-utils'

const user: UserAccountResponse = {
  id: '332601640831950848',
  loginName: 'temp_user',
  userName: '临时用户',
  mobile: '13800138000',
  status: 'NORMAL',
  lastLoginDate: null,
  remark: null,
}

describe('user-account-form-utils', () => {
  it('emptyUserFormValues 默认启用状态', () => {
    expect(emptyUserFormValues()).toEqual({
      loginName: '',
      userName: '',
      password: '',
      mobile: '',
      status: 'NORMAL',
    })
  })

  it('userToFormValues 清空密码并回填字段', () => {
    expect(userToFormValues(user)).toEqual({
      loginName: 'temp_user',
      userName: '临时用户',
      password: '',
      mobile: '13800138000',
      status: 'NORMAL',
    })
  })

  it('userToFormValues 将空手机号归一化为空串', () => {
    expect(userToFormValues({ ...user, mobile: null }).mobile).toBe('')
  })

  it('buildUserCreatePayload 去除空白并将空手机号转 undefined', () => {
    const payload = buildUserCreatePayload({
      loginName: '  temp_user  ',
      userName: '  临时用户  ',
      password: 'Abcd1234',
      mobile: '  ',
      status: 'NORMAL',
    })
    expect(payload).toEqual({
      loginName: 'temp_user',
      userName: '临时用户',
      password: 'Abcd1234',
      mobile: undefined,
      status: 'NORMAL',
    })
  })

  it('buildUserCreatePayload 拒绝弱密码', () => {
    expect(() =>
      buildUserCreatePayload({
        loginName: 'temp_user',
        userName: '临时用户',
        password: 'password',
        mobile: '',
        status: 'NORMAL',
      }),
    ).toThrow()
  })

  it('buildUserUpdatePayload 不含密码字段', () => {
    const payload = buildUserUpdatePayload({
      loginName: 'temp_user',
      userName: '改名',
      password: 'ignored',
      mobile: '13800138000',
      status: 'DISABLED',
    })
    expect(payload).toEqual({
      userName: '改名',
      mobile: '13800138000',
      status: 'DISABLED',
    })
    expect('loginName' in payload).toBe(false)
    expect('password' in payload).toBe(false)
  })

  it('状态纯函数在正常与禁用间切换', () => {
    expect(isUserActive('NORMAL')).toBe(true)
    expect(isUserActive('DISABLED')).toBe(false)
    expect(nextUserStatus('NORMAL')).toBe('DISABLED')
    expect(nextUserStatus('DISABLED')).toBe('NORMAL')
  })
})
