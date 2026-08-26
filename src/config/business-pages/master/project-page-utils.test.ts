import { describe, expect, it } from 'vitest'
import { resolveProjectCustomerDisplay } from './project-page-utils'

describe('resolveProjectCustomerDisplay', () => {
  it('按客户 ID 显示客户名称，而不是客户编码', () => {
    expect(
      resolveProjectCustomerDisplay(
        { customerId: '1001', customerCode: '1001' },
        [
          {
            id: '1001',
            value: '1001',
            label: '华东客户',
            customerName: '华东客户',
            customerCode: '1001',
          },
        ],
      ),
    ).toBe('华东客户')
  })

  it('客户选项未命中时回退客户编码', () => {
    expect(
      resolveProjectCustomerDisplay(
        { customerId: 'missing', customerCode: 'CUST-001' },
        [],
      ),
    ).toBe('CUST-001')
  })

  it('没有客户信息时显示标准占位符', () => {
    expect(resolveProjectCustomerDisplay({}, [])).toBe('--')
  })
})
