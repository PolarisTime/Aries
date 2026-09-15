import { describe, expect, it } from 'vitest'
import type { RoleResponse } from '@/shared/schemas'
import {
  buildRolePayload,
  emptyRoleFormValues,
  roleToFormValues,
} from './role-form-utils'

const role: RoleResponse = {
  id: '1',
  code: 'admin',
  name: '管理员',
  description: '系统管理员',
  builtin: true,
  status: '正常',
  permissionCount: 3,
  userCount: 1,
}

describe('role-form-utils', () => {
  it('emptyRoleFormValues 返回空表单', () => {
    expect(emptyRoleFormValues()).toEqual({
      code: '',
      name: '',
      description: '',
    })
  })

  it('roleToFormValues 归一化 null 描述', () => {
    expect(roleToFormValues({ ...role, description: null })).toEqual({
      code: 'admin',
      name: '管理员',
      description: '',
    })
  })

  it('内置角色不提交 code，避免修改内置编码', () => {
    const payload = buildRolePayload(
      { code: 'admin', name: '管理员', description: '系统管理员' },
      true,
    )
    expect(payload).toEqual({
      name: '管理员',
      description: '系统管理员',
    })
    expect('code' in payload).toBe(false)
  })

  it('非内置角色提交 code 并去除空白', () => {
    const payload = buildRolePayload(
      { code: '  sales  ', name: '  销售  ', description: '  ' },
      false,
    )
    expect(payload).toEqual({
      code: 'sales',
      name: '销售',
      description: undefined,
    })
  })

  it('非法表单抛出校验错误', () => {
    expect(() =>
      buildRolePayload({ code: 'sales', name: '   ' }, false),
    ).toThrow()
  })
})
