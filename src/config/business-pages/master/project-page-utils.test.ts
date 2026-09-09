import { describe, expect, it, vi } from 'vitest'

vi.mock('@/module-system/core/module-option-resolvers', () => ({
  getCustomerOptions: () => [
    {
      id: '1932500000000000001',
      value: '1932500000000000001',
      label: 'CUST-001',
      customerName: '华东客户',
      customerCode: 'CUST-001',
      defaultSettlementCompanyId: '1932500000000000002',
      defaultSettlementCompanyName: '主体一',
    },
    {
      id: '1932500000000000003',
      value: '1932500000000000003',
      label: 'CUST-002',
      customerName: '',
      customerCode: 'CUST-002',
    },
  ],
}))

import {
  projectCustomerFieldOptions,
  resolveProjectCustomerDisplay,
} from './project-page-utils'

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

describe('projectCustomerFieldOptions', () => {
  it('映射客户名称、编码与默认结算主体', () => {
    const options = projectCustomerFieldOptions()
    expect(options[0]).toEqual({
      label: '华东客户',
      value: '1932500000000000001',
      customerCode: 'CUST-001',
      customerName: '华东客户',
      settlementCompanyId: '1932500000000000002',
      settlementCompanyName: '主体一',
    })
  })

  it('客户名为空时回退 label，缺省结算主体为 undefined', () => {
    const options = projectCustomerFieldOptions()
    expect(options[1]).toMatchObject({
      label: 'CUST-002',
      value: '1932500000000000003',
      customerName: '',
      settlementCompanyId: undefined,
      settlementCompanyName: undefined,
    })
  })
})
