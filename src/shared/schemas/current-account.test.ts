import { describe, expect, it } from 'vitest'
import { currentAccountUpdateSchema } from './current-account'

/**
 * 手机号上限 20 的契约来源：
 * - 后端 `CurrentAccountUpdateRequest.mobile` 的 `@Size(max = 20)`
 *   （leo: src/main/java/com/leo/erp/auth/web/dto/CurrentAccountUpdateRequest.java）
 * - DB `sys_user.mobile` `character varying(20)`（V1__baseline.sql:1892）
 *
 * 此前前端停在 32：与后端 20 / DB varchar(20) 不一致（21~32 位串能通过前端校验，
 * 提交后才在服务端被拒），现已对齐为 20。
 *
 * 注意：`^$|^1\d{10}$` 的正则本身就只接受 11 位，因此 20 是**契约上限**而不是可达输入的边界
 * （19/20 位串在格式校验就已不通过）。测试同时覆盖「格式严于上限」这一事实，
 * 避免以后把 max(20) 误读成有效取值范围。
 */
describe('currentAccountUpdateSchema', () => {
  it('合法 11 位手机号可提交', () => {
    expect(
      currentAccountUpdateSchema.safeParse({
        userName: '张三',
        mobile: '13800138000',
        remark: '',
      }).success,
    ).toBe(true)
  })

  it('空手机号允许（后端正则 ^$|^1\\d{10}$）', () => {
    expect(
      currentAccountUpdateSchema.safeParse({
        userName: '张三',
        mobile: '',
        remark: '',
      }).success,
    ).toBe(true)
  })

  it('20 位与 21 位数字串都不通过（上限 20，且格式只接受 11 位）', () => {
    for (const mobile of ['1'.repeat(20), '1'.repeat(21)]) {
      expect(
        currentAccountUpdateSchema.safeParse({
          userName: '张三',
          mobile,
          remark: '',
        }).success,
      ).toBe(false)
    }
  })

  it('非 1 开头的 11 位串仍被格式校验拒绝', () => {
    expect(
      currentAccountUpdateSchema.safeParse({
        userName: '张三',
        mobile: '23456789012',
        remark: '',
      }).success,
    ).toBe(false)
  })

  it('姓名与备注沿用 64 / 255 上限', () => {
    expect(
      currentAccountUpdateSchema.safeParse({
        userName: 'x'.repeat(65),
        mobile: '',
        remark: '',
      }).success,
    ).toBe(false)
    expect(
      currentAccountUpdateSchema.safeParse({
        userName: '张三',
        mobile: '',
        remark: 'x'.repeat(256),
      }).success,
    ).toBe(false)
  })
})
