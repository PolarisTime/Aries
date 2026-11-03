import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPutMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPut: apiPutMock,
}))

import {
  fetchSupplierBrandSpecs,
  normalizeSupplierBrandSpecs,
  saveSupplierBrandSpecs,
  supplierBrandSpecKey,
  supplierBrandSpecListSchema,
} from './supplier-brand-specs'

/** 19 位雪花 ID：超出 Number.MAX_SAFE_INTEGER，只有按字符串处理才不会丢低位。 */
const SUPPLIER_ID = '333229108731322368'

const item = (overrides: Record<string, unknown> = {}) => ({
  brandName: '萍钢',
  category: '直条',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  ...overrides,
})

describe('供应商品牌规格配置 API', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPutMock.mockReset()
  })

  it('读取走 /suppliers/{id}/brand-specs，雪花 ID 原样进路径', async () => {
    apiGetMock.mockResolvedValue([item()])

    const result = await fetchSupplierBrandSpecs(SUPPLIER_ID)

    expect(apiGetMock).toHaveBeenCalledTimes(1)
    expect(apiGetMock.mock.calls[0][0]).toBe(
      `/suppliers/${SUPPLIER_ID}/brand-specs`,
    )
    expect(result).toEqual([item()])
  })

  it('未配置时后端返回空数组：原样得到空数组（= 按商品资料全量）', async () => {
    apiGetMock.mockResolvedValue([])

    await expect(fetchSupplierBrandSpecs(SUPPLIER_ID)).resolves.toEqual([])
  })

  it('读取时 trim 并丢弃无法归属品牌的脏条目', async () => {
    apiGetMock.mockResolvedValue([
      item({ brandName: '  萍钢  ', material: ' HRB400E ', length: ' 9米 ' }),
      item({ brandName: '   ' }),
    ])

    const result = await fetchSupplierBrandSpecs(SUPPLIER_ID)

    expect(result).toEqual([
      { ...item(), brandName: '萍钢', material: 'HRB400E', length: '9米' },
    ])
  })

  /*
   * 响应契约校验由 `apiGet` 内部执行（`parseApiContract`），所以这里直接对 schema 断言：
   * 用 mock 掉 apiGet 的用例去断言"会报错"会假绿 —— mock 根本不跑 schema。
   */
  it('响应缺字段时按契约报错，不静默当成合法配置', () => {
    expect(() =>
      supplierBrandSpecListSchema.parse([{ brandName: '萍钢', spec: 12 }]),
    ).toThrow()
  })

  it('响应 spec 为 0 或负数、或非整数时按契约报错（规格必须是正整数）', () => {
    expect(() =>
      supplierBrandSpecListSchema.parse([item({ spec: 0 })]),
    ).toThrow()
    expect(() =>
      supplierBrandSpecListSchema.parse([item({ spec: -3 })]),
    ).toThrow()
    expect(() =>
      supplierBrandSpecListSchema.parse([item({ spec: 1.5 })]),
    ).toThrow()
  })

  it('保存前归一化：trim、spec 字符串转整数、重复条目去重，并带幂等键', async () => {
    apiPutMock.mockResolvedValue([item()])

    await saveSupplierBrandSpecs(SUPPLIER_ID, [
      item({ brandName: ' 萍钢 ', spec: '12' as unknown as number }),
      item(),
    ])

    expect(apiPutMock).toHaveBeenCalledTimes(1)
    const [url, , payload, config] = apiPutMock.mock.calls[0]
    expect(url).toBe(`/suppliers/${SUPPLIER_ID}/brand-specs`)
    expect(payload).toEqual([item()])
    expect(
      (config as { headers?: Record<string, string> }).headers?.[
        'X-Idempotency-Key'
      ],
    ).toBeTruthy()
  })

  it('空数组表示清空配置：照常提交空载荷，不提前短路', async () => {
    apiPutMock.mockResolvedValue([])

    await expect(saveSupplierBrandSpecs(SUPPLIER_ID, [])).resolves.toEqual([])
    expect(apiPutMock.mock.calls[0][2]).toEqual([])
  })

  it('非法载荷（spec 非正整数）在客户端失败，不发出请求', async () => {
    await expect(
      saveSupplierBrandSpecs(SUPPLIER_ID, [item({ spec: 1.5 })]),
    ).rejects.toThrow(/供应商品牌规格请求/)
    await expect(
      saveSupplierBrandSpecs(SUPPLIER_ID, [item({ length: '' })]),
    ).rejects.toThrow(/供应商品牌规格请求/)
    expect(apiPutMock).not.toHaveBeenCalled()
  })

  it('缺品牌的脏条目在归一化阶段被丢弃，不会拼成一条空品牌配置', async () => {
    apiPutMock.mockResolvedValue([item()])

    await saveSupplierBrandSpecs(SUPPLIER_ID, [item({ brandName: '   ' })])

    expect(apiPutMock.mock.calls[0][2]).toEqual([])
  })

  it('供应商 ID 非法时失败关闭，不把脏 ID 拼进路径', async () => {
    await expect(fetchSupplierBrandSpecs('abc')).rejects.toThrow()
    await expect(fetchSupplierBrandSpecs('0')).rejects.toThrow()
    expect(apiGetMock).not.toHaveBeenCalled()
  })
})

describe('品牌规格条目键与归一化', () => {
  it('键覆盖 品牌/类别/材质/规格/定尺 五个维度', () => {
    expect(supplierBrandSpecKey(item())).toBe('萍钢|直条|HRB400E|12|9米')
    // 只有品牌不同 → 键不同（同一组合在不同品牌下是不同商品）
    expect(supplierBrandSpecKey(item({ brandName: '中天' }))).not.toBe(
      supplierBrandSpecKey(item()),
    )
    // 只改定尺也要区分
    expect(supplierBrandSpecKey(item({ length: '12米' }))).not.toBe(
      supplierBrandSpecKey(item()),
    )
  })

  it('归一化不修改入参，重复条目只保留一条', () => {
    const input = [item(), item({ brandName: ' 萍钢 ' })]
    const result = normalizeSupplierBrandSpecs(input)

    expect(result).toHaveLength(1)
    expect(input[1].brandName).toBe(' 萍钢 ')
  })

  it('响应 schema 兼容 spec 的字符串数字（后端 Long/Integer 序列化差异）', () => {
    const parsed = supplierBrandSpecListSchema.parse([item({ spec: '16' })])

    expect(parsed[0].spec).toBe(16)
  })
})
