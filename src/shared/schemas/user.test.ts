import { describe, expect, it } from 'vitest'
import { userRolesResponseSchema } from './role'
import {
  userAccountResponseSchema,
  userCreateFormSchema,
  userCreatePayloadSchema,
  userFormSchema,
  userListPageSchema,
  userPasswordResetPayloadSchema,
  userStatusUpdatePayloadSchema,
  userUpdatePayloadSchema,
} from './user'

const baseUser = {
  id: '332601640831950848',
  loginName: 'temp_user',
  userName: '临时用户',
  mobile: '13800138000',
  status: 'NORMAL',
  lastLoginDate: '2026-09-15T23:20:31.594647+08:00',
  remark: null,
}

describe('userAccountResponseSchema', () => {
  it('解析雪花 ID 字符串与状态枚举', () => {
    const parsed = userAccountResponseSchema.parse(baseUser)
    expect(parsed.id).toBe('332601640831950848')
    expect(parsed.status).toBe('NORMAL')
  })

  it('允许最近登录与备注为空', () => {
    const parsed = userAccountResponseSchema.parse({
      ...baseUser,
      lastLoginDate: null,
      remark: null,
      mobile: null,
    })
    expect(parsed.lastLoginDate).toBeNull()
    expect(parsed.mobile).toBeNull()
  })

  it('拒绝未知状态', () => {
    expect(() =>
      userAccountResponseSchema.parse({ ...baseUser, status: '正常' }),
    ).toThrow()
  })

  it('拒绝非法雪花 ID', () => {
    expect(() =>
      userAccountResponseSchema.parse({ ...baseUser, id: 'abc' }),
    ).toThrow()
  })
})

describe('userListPageSchema', () => {
  it('解析标准 PageResponse', () => {
    const parsed = userListPageSchema.parse({
      content: [baseUser],
      totalElements: '1',
      totalPages: 1,
      currentPage: 0,
      pageSize: 20,
      hasMore: false,
    })
    expect(parsed.content).toHaveLength(1)
    expect(parsed.totalElements).toBe(1)
  })

  it('拒绝缺少 hasMore 的分页响应', () => {
    expect(() =>
      userListPageSchema.parse({
        content: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: 0,
        pageSize: 20,
      }),
    ).toThrow()
  })
})

describe('用户请求校验', () => {
  it('新增要求登录名、姓名与强密码', () => {
    expect(
      userCreatePayloadSchema.safeParse({
        loginName: 'temp_user',
        userName: '临时用户',
        password: 'Abcd1234',
      }).success,
    ).toBe(true)
    expect(
      userCreatePayloadSchema.safeParse({
        loginName: 'temp_user',
        userName: '临时用户',
        password: '12345678',
      }).success,
    ).toBe(false)
    expect(
      userCreatePayloadSchema.safeParse({
        loginName: 'temp_user',
        userName: '临时用户',
        password: 'abcdefgh',
      }).success,
    ).toBe(false)
  })

  it('登录名不允许以特殊字符开头', () => {
    expect(
      userCreatePayloadSchema.safeParse({
        loginName: '.bad',
        userName: 'x',
        password: 'Abcd1234',
      }).success,
    ).toBe(false)
  })

  it('手机号只接受空或 11 位大陆号码', () => {
    const base = {
      loginName: 'temp_user',
      userName: '临时用户',
      password: 'Abcd1234',
    }
    expect(
      userCreatePayloadSchema.safeParse({ ...base, mobile: '' }).success,
    ).toBe(true)
    expect(
      userCreatePayloadSchema.safeParse({ ...base, mobile: '13800138000' })
        .success,
    ).toBe(true)
    expect(
      userCreatePayloadSchema.safeParse({ ...base, mobile: '12345' }).success,
    ).toBe(false)
  })

  it('编辑载荷不含密码字段且姓名必填', () => {
    expect(
      userUpdatePayloadSchema.safeParse({
        userName: '改名',
        mobile: '',
        status: 'DISABLED',
      }).success,
    ).toBe(true)
    expect(userUpdatePayloadSchema.safeParse({ userName: '  ' }).success).toBe(
      false,
    )
  })

  it('状态更新仅接受 NORMAL/DISABLED', () => {
    expect(
      userStatusUpdatePayloadSchema.safeParse({ status: 'NORMAL' }).success,
    ).toBe(true)
    expect(
      userStatusUpdatePayloadSchema.safeParse({ status: 'ENABLED' }).success,
    ).toBe(false)
  })

  it('密码重置要求强密码', () => {
    expect(
      userPasswordResetPayloadSchema.safeParse({ newPassword: 'Abcd1234' })
        .success,
    ).toBe(true)
    expect(
      userPasswordResetPayloadSchema.safeParse({ newPassword: 'password' })
        .success,
    ).toBe(false)
  })

  it('表单去除首尾空白且新增必填密码', () => {
    const parsed = userFormSchema.parse({
      loginName: '  temp_user  ',
      userName: '  临时用户  ',
      mobile: '  ',
      status: 'NORMAL',
    })
    expect(parsed.loginName).toBe('temp_user')
    expect(parsed.userName).toBe('临时用户')
    expect(
      userCreateFormSchema.safeParse({
        loginName: 'temp_user',
        userName: '临时用户',
        status: 'NORMAL',
      }).success,
    ).toBe(false)
  })
})

describe('userRolesResponseSchema', () => {
  it('归一化 { roles: [{ id }] } 为字符串 ID 数组', () => {
    const parsed = userRolesResponseSchema.parse({
      userId: '1',
      roles: [{ id: '1' }, { id: '332601640831950848' }],
    })
    expect(parsed).toEqual(['1', '332601640831950848'])
  })

  it('兼容字符串数组形态', () => {
    expect(userRolesResponseSchema.parse(['1', '2'])).toEqual(['1', '2'])
  })

  it('拒绝非字符串 ID 数组', () => {
    expect(() => userRolesResponseSchema.parse([1])).toThrow()
  })
})
