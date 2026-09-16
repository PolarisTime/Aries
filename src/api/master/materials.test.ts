import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ZodType } from 'zod'

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

import { parseApiContract } from '@/api/core/api-contract'
import {
  createExpenseMaterial,
  diffMaterialSnapshots,
  fetchAllMaterialOptions,
  fetchMaterialHistories,
  fetchMaterialSearch,
  previewMaterialImportFile,
  rollbackMaterialImportBatch,
} from './materials'

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

function pageOf(
  ids: string[],
  totalPages: number,
): {
  content: { id: string; brand: string }[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasMore: boolean
} {
  return {
    content: ids.map((id) => ({ id, brand: '泸钢' })),
    totalElements: ids.length,
    totalPages,
    currentPage: 0,
    pageSize: 200,
    hasMore: totalPages > 1,
  }
}

describe('商品选项分页拉全', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
    fetchGeneratedMasterDataCodeMock.mockReset()
  })

  it('按总页数拉全并合并所有页', async () => {
    apiGetMock
      .mockResolvedValueOnce(pageOf(['100000000000000001'], 2))
      .mockResolvedValueOnce(pageOf(['100000000000000002'], 2))

    const rows = await fetchAllMaterialOptions()

    expect(apiGetMock).toHaveBeenCalledTimes(2)
    const [, , firstOptions] = apiGetMock.mock.calls[0]
    expect(firstOptions.params).toMatchObject({
      keyword: '',
      page: 0,
      size: 200,
    })
    const [, , secondOptions] = apiGetMock.mock.calls[1]
    expect(secondOptions.params).toMatchObject({
      keyword: '',
      page: 1,
      size: 200,
    })
    expect(rows.map((row) => row.id)).toEqual([
      '100000000000000001',
      '100000000000000002',
    ])
  })

  it('携带 materialType 时把它透传给后端', async () => {
    apiGetMock.mockResolvedValue(pageOf(['100000000000000003'], 1))

    await fetchAllMaterialOptions('附加费用')

    const [, , options] = apiGetMock.mock.calls[0]
    expect(options.params).toMatchObject({
      keyword: '',
      page: 0,
      size: 200,
      materialType: '附加费用',
    })
  })

  it('只有一页时只请求一次', async () => {
    apiGetMock.mockResolvedValue(pageOf([], 1))

    await fetchAllMaterialOptions()

    expect(apiGetMock).toHaveBeenCalledTimes(1)
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

function parseWithSchema(schema: unknown, value: unknown) {
  return parseApiContract(schema as ZodType, value, 'test')
}

describe('商品版本历史 schema 解析', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
  })

  it('解析分页并保持雪花 ID 为字符串', async () => {
    const rawHistoryPage = {
      content: [
        {
          id: '100000000000000001',
          materialId: '100000000000000002',
          changeSource: 'IMPORT',
          changeType: 'UPDATED',
          before: {
            id: '100000000000000002',
            materialCode: 'M-1',
            brand: '宝钢',
            pieceWeightTon: '1.250',
            unitPrice: '10.00',
          },
          after: {
            id: '100000000000000002',
            materialCode: 'M-1',
            brand: '沙钢',
            pieceWeightTon: 1.5,
          },
          importBatchNo: '888000000000000001',
          remark: null,
          changedBy: '900000000000000009',
          changedAt: '2026-09-14T10:00:00+08:00',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      pageSize: 10,
      hasMore: false,
    }
    apiGetMock.mockImplementation((_url: string, schema: unknown) =>
      Promise.resolve(parseWithSchema(schema, rawHistoryPage)),
    )

    const result = await fetchMaterialHistories('100000000000000002', 2, 10)

    expect(apiGetMock.mock.calls[0][0]).toBe(
      '/materials/100000000000000002/histories',
    )
    expect(apiGetMock.mock.calls[0][2].params).toMatchObject({
      page: 1,
      size: 10,
      sortBy: 'id',
      direction: 'desc',
    })
    expect(result.content[0]).toMatchObject({
      id: '100000000000000001',
      materialId: '100000000000000002',
      changeSource: 'IMPORT',
      changeType: 'UPDATED',
      importBatchNo: '888000000000000001',
      changedBy: '900000000000000009',
    })
    expect(result.content[0].before?.id).toBe('100000000000000002')
    expect(result.content[0].after?.brand).toBe('沙钢')
  })

  it('快照缺失或非对象时降级为 null', async () => {
    apiGetMock.mockImplementation((_url: string, schema: unknown) =>
      Promise.resolve(
        parseWithSchema(schema, {
          content: [
            {
              id: '1',
              materialId: '2',
              changeSource: 'MANUAL',
              changeType: 'CREATED',
              before: null,
              after: 'unexpected',
              importBatchNo: null,
              remark: null,
              changedBy: null,
              changedAt: null,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
          pageSize: 10,
          hasMore: false,
        }),
      ),
    )

    const result = await fetchMaterialHistories('2')

    expect(result.content[0].before).toBeNull()
    expect(result.content[0].after).toBeNull()
  })
})

describe('商品导入差异预览 schema 解析', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
  })

  it('解析每行结果与字段差异，materialId 归一化为字符串', async () => {
    const rawPreview = {
      totalRows: 2,
      createdCount: 1,
      updatedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      rows: [
        {
          rowNumber: 1,
          materialCode: null,
          brand: '宝钢',
          material: '螺纹钢',
          spec: 'HRB400',
          length: '9m',
          outcome: 'CREATED',
          materialId: null,
          changes: [
            { field: 'brand', label: '品牌', before: null, after: '宝钢' },
          ],
          reason: null,
        },
        {
          rowNumber: 2,
          materialCode: 'M-1',
          brand: '沙钢',
          material: '螺纹钢',
          spec: 'HRB400',
          length: '9m',
          outcome: 'UPDATED',
          materialId: '100000000000000002',
          changes: [
            { field: 'brand', label: '品牌', before: '宝钢', after: '沙钢' },
          ],
          reason: null,
        },
      ],
    }
    apiPostMock.mockImplementation((_url: string, schema: unknown) =>
      Promise.resolve(parseWithSchema(schema, rawPreview)),
    )

    const result = await previewMaterialImportFile(
      new File(['x'], 'materials.xlsx'),
    )

    expect(apiPostMock.mock.calls[0][0]).toBe('/material-imports/previews')
    expect(result.rows[0].changes).toEqual([
      { field: 'brand', label: '品牌', before: null, after: '宝钢' },
    ])
    expect(result.rows[1].materialId).toBe('100000000000000002')
    expect(result.createdCount).toBe(1)
    expect(result.updatedCount).toBe(1)
  })
})

describe('导入批次回滚 schema 解析', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
  })

  it('调用 rollbacks 子资源并映射 totalRows', async () => {
    apiPostMock.mockImplementation((_url: string, schema: unknown) =>
      Promise.resolve(
        parseWithSchema(schema, {
          importBatchNo: '888',
          totalRows: 5,
          createdRolledBack: 2,
          updatedRestored: 3,
          missing: 0,
        }),
      ),
    )

    const result = await rollbackMaterialImportBatch('888')

    expect(apiPostMock.mock.calls[0][0]).toBe('/import-batches/888/rollbacks')
    expect(result).toEqual({
      importBatchNo: '888',
      totalRows: 5,
      createdRolledBack: 2,
      updatedRestored: 3,
      missing: 0,
    })
  })

  it('兼容旧字段名 total', async () => {
    apiPostMock.mockImplementation((_url: string, schema: unknown) =>
      Promise.resolve(
        parseWithSchema(schema, {
          importBatchNo: '999',
          total: 4,
          createdRolledBack: 0,
          updatedRestored: 0,
          missing: 0,
        }),
      ),
    )

    const result = await rollbackMaterialImportBatch('999')

    expect(result.totalRows).toBe(4)
  })
})

describe('diffMaterialSnapshots', () => {
  it('只返回发生变化的字段', () => {
    expect(
      diffMaterialSnapshots(
        { brand: '宝钢', materialCode: 'M-1' },
        { brand: '沙钢', materialCode: 'M-1' },
      ),
    ).toEqual([{ field: 'brand', before: '宝钢', after: '沙钢' }])
  })

  it('新建时列出 after 的非空字段，删除时列出 before', () => {
    expect(diffMaterialSnapshots(null, { brand: '宝钢', remark: '' })).toEqual([
      { field: 'brand', before: null, after: '宝钢' },
    ])
    expect(diffMaterialSnapshots({ brand: '宝钢' }, null)).toEqual([
      { field: 'brand', before: '宝钢', after: null },
    ])
  })
})
