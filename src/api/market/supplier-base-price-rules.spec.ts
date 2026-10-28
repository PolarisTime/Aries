import { describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
}))

vi.mock('@/api/core/client', () => client)

import {
  fetchSupplierBasePriceRules,
  saveSupplierBasePriceRules,
} from './supplier-base-price-rules'

const response = {
  supplierId: '333229108731322368',
  brandName: '中天',
  base: { material: 'HRB400E', spec: 10, length: '9米' },
  items: [
    { material: 'HRB400E', spec: 10, length: '9米', delta: 0 },
    { material: 'HRB400E', spec: 12, length: '9米', delta: '50' },
  ],
  version: 3,
}

describe('基价加价规则客户端', () => {
  it('读取并按 supplierId/brandName 查询，规范化数字与版本', async () => {
    client.apiGet.mockReset().mockResolvedValue(response)

    const rules = await fetchSupplierBasePriceRules(
      '333229108731322368',
      '中天',
    )

    expect(client.apiGet).toHaveBeenCalledWith(
      '/supplier-base-price-rules',
      expect.anything(),
      expect.objectContaining({
        params: { supplierId: '333229108731322368', brandName: '中天' },
      }),
    )
    expect(rules.base).toEqual({ material: 'HRB400E', spec: 10, length: '9米' })
    expect(rules.items[1]).toEqual({
      material: 'HRB400E',
      spec: 12,
      length: '9米',
      delta: 50,
    })
    expect(rules.version).toBe('3')
  })

  it('未配置时 base 为 null、items 为空（页面据此不联动）', async () => {
    client.apiGet.mockReset().mockResolvedValue({
      supplierId: '1',
      brandName: '中天',
      base: null,
      items: [],
      version: 0,
    })

    const rules = await fetchSupplierBasePriceRules('1', '中天')

    expect(rules.base).toBeNull()
    expect(rules.items).toEqual([])
  })

  it('保存带 X-Resource-Version 前置条件与幂等键', async () => {
    client.apiPut.mockReset().mockResolvedValue(response)

    await saveSupplierBasePriceRules(
      {
        supplierId: '333229108731322368',
        brandName: '中天',
        base: { material: 'HRB400E', spec: 10, length: '9米' },
        items: [{ material: 'HRB400E', spec: 12, length: '9米', delta: 50 }],
      },
      '3',
    )

    const config = client.apiPut.mock.calls[0]?.[3] as {
      headers?: Record<string, string>
    }
    expect(config.headers?.['X-Resource-Version']).toBe('3')
    expect(config.headers?.['X-Idempotency-Key']).toBeTruthy()
  })
})
