import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }))

vi.mock('@/api/core/client', () => ({ apiGet: apiGetMock }))

import {
  fetchSupplierOptions,
  normalizeSupplierOptions,
  supplierDisplayName,
} from './supplier-options'

describe('normalizeSupplierOptions', () => {
  it('保留经营品牌并保持简称优先展示', () => {
    const [option] = normalizeSupplierOptions([
      {
        id: '1001',
        supplierCode: 'S001',
        supplierName: '沙钢集团有限公司',
        shortName: '沙钢',
        brands: ['中天', '永钢', ' '],
        value: '1001',
        label: '沙钢集团有限公司',
      },
    ])
    expect(option.brands).toEqual(['中天', '永钢'])
    expect(supplierDisplayName(option)).toBe('沙钢')
    expect(option.value).toBe('1001')
    expect(option.label).toBe('沙钢集团有限公司')
  })

  it('缺省品牌时归一为空数组', () => {
    const [option] = normalizeSupplierOptions([
      {
        id: '1002',
        supplierCode: 'S002',
        supplierName: '河钢',
        value: '1002',
        label: '河钢',
      },
    ])
    expect(option.brands).toEqual([])
    expect(supplierDisplayName(option)).toBe('河钢')
  })

  it('品牌非数组时忽略', () => {
    const [option] = normalizeSupplierOptions([
      {
        id: '1003',
        supplierCode: 'S003',
        supplierName: '亚新',
        brands: '中天',
        value: '1003',
        label: '亚新',
      },
    ])
    expect(option.brands).toEqual([])
  })
})

describe('fetchSupplierOptions', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('解析接口返回的经营品牌字段', async () => {
    apiGetMock.mockResolvedValueOnce([
      {
        id: '2001',
        supplierCode: 'S101',
        supplierName: '沙钢',
        shortName: '沙钢',
        brands: ['中天'],
        value: '2001',
        label: '沙钢',
      },
    ])

    const [option] = await fetchSupplierOptions()
    expect(apiGetMock).toHaveBeenCalledTimes(1)
    expect(option.brands).toEqual(['中天'])
    expect(option.shortName).toBe('沙钢')
  })
})
