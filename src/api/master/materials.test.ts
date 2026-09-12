import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPostMock, fetchGeneratedMasterDataCodeMock } =
  vi.hoisted(() => ({
    apiGetMock: vi.fn(),
    apiPostMock: vi.fn(),
    fetchGeneratedMasterDataCodeMock: vi.fn(),
  }))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  downloadGet: vi.fn(),
}))

vi.mock('@/api/master/master-data-codes', () => ({
  fetchGeneratedMasterDataCode: fetchGeneratedMasterDataCodeMock,
}))

import { createExpenseMaterial, fetchMaterialSearch } from './materials'

const emptyPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  currentPage: 0,
  pageSize: 200,
  hasMore: false,
}

describe('商品搜索附加费用过滤', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
    fetchGeneratedMasterDataCodeMock.mockReset()
  })

  it('按类型过滤时把 materialType 传给后端，避免被分页截断后客户端过滤为空', async () => {
    apiGetMock.mockResolvedValue(emptyPage)

    await fetchMaterialSearch('', 200, '附加费用')

    expect(apiGetMock).toHaveBeenCalledTimes(1)
    const [, , options] = apiGetMock.mock.calls[0]
    expect(options.params).toMatchObject({
      keyword: '',
      page: 0,
      size: 200,
      materialType: '附加费用',
    })
  })

  it('不传类型时不携带 materialType 参数', async () => {
    apiGetMock.mockResolvedValue(emptyPage)

    await fetchMaterialSearch()

    const [, , options] = apiGetMock.mock.calls[0]
    expect(options.params).not.toHaveProperty('materialType')
  })

  it('limit 超过后端上限时收敛为 200', async () => {
    apiGetMock.mockResolvedValue(emptyPage)

    await fetchMaterialSearch('', 9999, '附加费用')

    const [, , options] = apiGetMock.mock.calls[0]
    expect(options.params.size).toBe(200)
  })
})

describe('快捷新增附加费用主数据', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
    fetchGeneratedMasterDataCodeMock.mockReset()
  })

  it('先签发商品编码再创建，兼容后端 @NotBlank 与签发校验', async () => {
    fetchGeneratedMasterDataCodeMock.mockResolvedValue('333662242446770176')
    apiPostMock.mockResolvedValue({ id: '990001' })

    await expect(createExpenseMaterial('测试装卸费')).resolves.toEqual({
      id: '990001',
      name: '测试装卸费',
      unit: '次',
    })

    expect(fetchGeneratedMasterDataCodeMock).toHaveBeenCalledWith('material')
    const [, , body] = apiPostMock.mock.calls[0]
    expect(body).toMatchObject({
      materialCode: '333662242446770176',
      material: '测试装卸费',
      category: '附加费用',
      materialType: '附加费用',
      unit: '次',
    })
  })

  it('未签发到编码时不发起创建请求', async () => {
    fetchGeneratedMasterDataCodeMock.mockRejectedValue(new Error('签发失败'))

    await expect(createExpenseMaterial('测试装卸费')).rejects.toThrow(
      '签发失败',
    )
    expect(apiPostMock).not.toHaveBeenCalled()
  })
})
