import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiPostMock, downloadGetMock, downloadBlobMock, downloadPostMock } =
  vi.hoisted(() => ({
    apiPostMock: vi.fn(),
    downloadGetMock: vi.fn(),
    downloadBlobMock: vi.fn(),
    downloadPostMock: vi.fn(),
  }))

vi.mock('@/api/core/client', () => ({
  apiPost: apiPostMock,
  downloadGet: downloadGetMock,
  downloadPost: downloadPostMock,
}))

vi.mock('@/utils/download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/download')>()
  return { ...actual, downloadBlob: downloadBlobMock }
})

import {
  exportModuleData,
  exportModuleRecordsByIds,
  RECORD_ID_EXPORT_MODULES,
  supportsRecordIdExport,
} from '@/api/business/common-export'
import { ENDPOINTS } from '@/constants/endpoints'

/** 后端 `ExportArtifactResponse`：id 为雪花 id 十进制字符串，size 为字节数（number）。 */
function exportArtifact(overrides: Record<string, unknown> = {}) {
  return {
    id: '700000000000000001',
    kind: 'MODULE_EXPORT',
    fileName: '销售出库单.xlsx',
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1024,
    createdAt: '2026-11-15T00:00:00Z',
    expiresAt: '2026-11-15T00:30:00Z',
    contentPath: '/v2.0/module-export-requests/700000000000000001/content',
    ...overrides,
  }
}

interface ExportRequestConfig {
  headers?: Record<string, string>
  suppressGlobalErrorStatuses?: readonly number[]
  params?: unknown
}

const configOf = (call?: unknown[], index = 3): ExportRequestConfig =>
  (call?.[index] as ExportRequestConfig | undefined) ?? {}

describe('exportModuleRecordsByIds 按记录 id 集合导出', () => {
  beforeEach(() => {
    apiPostMock.mockReset()
    downloadGetMock.mockReset()
    downloadBlobMock.mockReset()
    downloadPostMock.mockReset()
    apiPostMock.mockResolvedValue(exportArtifact())
    downloadGetMock.mockResolvedValue(new Blob(['xlsx']))
  })

  it('先 POST 创建导出资源, 再用 GET content 下载', async () => {
    await exportModuleRecordsByIds('sales-outbound', ['101', '205'])

    // 第一步：创建导出请求（POST /module-export-requests）
    expect(apiPostMock).toHaveBeenCalledTimes(1)
    const [url, , body, config] = apiPostMock.mock.calls[0]
    expect(url).toBe(ENDPOINTS.MODULE_EXPORT_REQUESTS)
    expect(ENDPOINTS.MODULE_EXPORT_REQUESTS).toBe('/module-export-requests')
    expect(body).toEqual({
      moduleKey: 'sales-outbound',
      recordIds: ['101', '205'],
    })
    // 雪花 id 一律以十进制字符串传递，禁止数值转换
    expect(body.recordIds.every((id: unknown) => typeof id === 'string')).toBe(
      true,
    )
    // 400/403/404/422 由调用方呈现明确提示，避免全局提示重复弹窗
    expect(config.suppressGlobalErrorStatuses).toEqual([400, 403, 404, 422])

    // 第二步：GET content（contentPath 去掉版本前缀后按 baseURL 请求）
    expect(downloadGetMock).toHaveBeenCalledTimes(1)
    expect(downloadGetMock.mock.calls[0][0]).toBe(
      '/module-export-requests/700000000000000001/content',
    )
    expect(downloadBlobMock).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(downloadBlobMock.mock.calls[0][1]).toBe('销售出库单.xlsx')
  })

  it('产物未给出文件名时回退到模块文件名', async () => {
    apiPostMock.mockResolvedValue(exportArtifact({ fileName: '' }))

    await exportModuleRecordsByIds('sales-outbound', ['101'])

    expect(downloadBlobMock.mock.calls[0][1]).toBe(
      'sales-outbound-selected.xlsx',
    )
  })

  it('产物过期（content 返回 404）时提示重新生成, 不落盘', async () => {
    downloadGetMock.mockRejectedValue(
      Object.assign(new Error('Not Found'), { status: 404 }),
    )

    await expect(
      exportModuleRecordsByIds('sales-outbound', ['101']),
    ).rejects.toThrow('导出文件已过期')
    expect(downloadBlobMock).not.toHaveBeenCalled()
  })

  it('模块白名单与后端导出的业务单据集合一致', () => {
    expect(RECORD_ID_EXPORT_MODULES).toEqual([
      'purchase-order',
      'purchase-inbound',
      'sales-order',
      'sales-outbound',
      'sales-return',
      'freight-bill',
      'customer-statement',
      'freight-statement',
      'receipt',
      'payment',
    ])
    expect(supportsRecordIdExport('sales-order')).toBe(true)
    expect(supportsRecordIdExport('material')).toBe(false)
    expect(supportsRecordIdExport('supplier')).toBe(false)
  })

  /*
   * 后端导出请求控制器是类级 @IdempotencyRequired：POST /module-export-requests
   * 必须带 X-Idempotency-Key（缺头 422）。此前该调用只处理了文件名与错误抑制，没有幂等键。
   */
  it('创建导出请求带非空幂等键, 同一次动作内可复用', async () => {
    await exportModuleRecordsByIds('sales-outbound', ['101'])
    await exportModuleRecordsByIds(
      'sales-outbound',
      ['101'],
      'export-action-key',
    )

    const firstKey = configOf(apiPostMock.mock.calls[0]).headers?.[
      'X-Idempotency-Key'
    ]
    expect(typeof firstKey).toBe('string')
    expect((firstKey ?? '').length).toBeGreaterThan(0)
    expect(configOf(apiPostMock.mock.calls[1]).headers).toMatchObject({
      'X-Idempotency-Key': 'export-action-key',
    })
    // 既有的"由调用方呈现 400/403/404/422"策略保持不变
    expect(
      configOf(apiPostMock.mock.calls[0]).suppressGlobalErrorStatuses,
    ).toEqual([400, 403, 404, 422])
  })
})

describe('exportModuleData 商品资料导出', () => {
  beforeEach(() => {
    apiPostMock.mockReset()
    downloadGetMock.mockReset()
    downloadBlobMock.mockReset()
    downloadPostMock.mockReset()
    apiPostMock.mockResolvedValue(
      exportArtifact({
        kind: 'MATERIAL_EXPORT',
        fileName: 'material.xlsx',
        contentPath:
          '/v2.0/material-export-requests/700000000000000001/content',
      }),
    )
    downloadGetMock.mockResolvedValue(new Blob(['xlsx']))
  })

  it('筛选条件改为 JSON 请求体, 不再走查询参数', async () => {
    await exportModuleData('material', { keyword: 'HRB400' })

    expect(downloadPostMock).not.toHaveBeenCalled()
    const [url, , body, config] = apiPostMock.mock.calls[0]
    expect(url).toBe(ENDPOINTS.MATERIAL_EXPORT_REQUESTS)
    expect(ENDPOINTS.MATERIAL_EXPORT_REQUESTS).toBe('/material-export-requests')
    expect(body).toMatchObject({ format: 'xlsx' })
    // 旧的查询参数通路必须彻底移除：payload 走请求体
    expect(config.params).toBeUndefined()
    expect(downloadGetMock.mock.calls[0][0]).toBe(
      '/material-export-requests/700000000000000001/content',
    )
    expect(downloadBlobMock.mock.calls[0][1]).toBe('material.xlsx')
  })

  it('没有关键字时不提交空 keyword', async () => {
    await exportModuleData('material', {})

    const body = apiPostMock.mock.calls[0][2] as Record<string, unknown>
    expect(body.format).toBe('xlsx')
    expect('keyword' in body).toBe(false)
  })
})
