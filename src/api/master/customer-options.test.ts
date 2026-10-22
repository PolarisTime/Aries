import { describe, expect, it, vi } from 'vitest'

vi.mock('@/api/core/client', () => ({
  apiGet: vi.fn(
    (_url: string, schema: { parse: (input: unknown) => unknown }) =>
      Promise.resolve(
        schema.parse([
          {
            id: '1932500000000000001',
            value: '1932500000000000001',
            label: '华东客户',
            customerCode: 'CUST-001',
            customerName: '华东客户',
            // 后端已删除客户快照里的默认结算主体；旧缓存/旧网关若仍下发，
            // 归一化结果也不得再带出这两个字段（结算主体唯一入口改为项目资料）。
            defaultSettlementCompanyId: '1932500000000000002',
            defaultSettlementCompanyName: '主体一',
          },
        ]),
      ),
  ),
}))

import {
  fetchCustomerOptions,
  normalizeCustomerRows,
} from '@/api/master/customer-options'

describe('客户下拉选项不再携带默认结算主体', () => {
  it('normalizeCustomerRows 丢弃默认结算主体 ID / 名称', () => {
    const [option] = normalizeCustomerRows([
      {
        id: '1932500000000000001',
        value: '1932500000000000001',
        label: '华东客户',
        customerCode: 'CUST-001',
        customerName: '华东客户',
        defaultSettlementCompanyId: '1932500000000000002',
        defaultSettlementCompanyName: '主体一',
      } as unknown as Parameters<typeof normalizeCustomerRows>[0][number],
    ])

    expect(option).toEqual({
      id: '1932500000000000001',
      value: '1932500000000000001',
      label: '华东客户',
      customerCode: 'CUST-001',
      customerName: '华东客户',
    })
    expect(option).not.toHaveProperty('defaultSettlementCompanyId')
    expect(option).not.toHaveProperty('defaultSettlementCompanyName')
  })

  it('接口响应里的历史默认结算主体字段被 raw schema 剔除', async () => {
    const options = await fetchCustomerOptions()

    expect(options).toHaveLength(1)
    expect(options[0]).toEqual({
      id: '1932500000000000001',
      value: '1932500000000000001',
      label: '华东客户',
      customerCode: 'CUST-001',
      customerName: '华东客户',
    })
    expect(options[0]).not.toHaveProperty('defaultSettlementCompanyId')
    expect(options[0]).not.toHaveProperty('defaultSettlementCompanyName')
  })
})
