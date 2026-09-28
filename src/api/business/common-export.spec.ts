import { beforeEach, describe, expect, it, vi } from 'vitest'

const { downloadPostResponseMock, downloadBlobMock } = vi.hoisted(() => ({
  downloadPostResponseMock: vi.fn(),
  downloadBlobMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  downloadPost: vi.fn(),
  downloadPostResponse: downloadPostResponseMock,
}))

vi.mock('@/utils/download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/download')>()
  return { ...actual, downloadBlob: downloadBlobMock }
})

import {
  exportModuleRecordsByIds,
  RECORD_ID_EXPORT_MODULES,
  supportsRecordIdExport,
} from '@/api/business/common-export'
import { ENDPOINTS } from '@/constants/endpoints'

describe('exportModuleRecordsByIds 按记录 id 集合导出', () => {
  beforeEach(() => {
    downloadPostResponseMock.mockReset()
    downloadBlobMock.mockReset()
    downloadPostResponseMock.mockResolvedValue({
      data: new Blob(['xlsx']),
      headers: {
        'content-disposition':
          'attachment; filename="fallback.xlsx"; filename*=UTF-8\'\'%E9%94%80%E5%94%AE%E5%87%BA%E5%BA%93%E5%8D%95.xlsx',
      },
    })
  })

  it('请求体只包含勾选的雪花 id 字符串', async () => {
    await exportModuleRecordsByIds('sales-outbound', ['101', '205'])

    expect(downloadPostResponseMock).toHaveBeenCalledTimes(1)
    const [url, body, config] = downloadPostResponseMock.mock.calls[0]
    expect(url).toBe(ENDPOINTS.MODULE_EXPORTS)
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
  })

  it('优先使用响应头里的文件名，缺失时回退到模块文件名', async () => {
    await exportModuleRecordsByIds('sales-outbound', ['101'])
    expect(downloadBlobMock.mock.calls[0][1]).toBe('销售出库单.xlsx')

    downloadBlobMock.mockReset()
    downloadPostResponseMock.mockResolvedValue({
      data: new Blob(['xlsx']),
      headers: {},
    })
    await exportModuleRecordsByIds('sales-outbound', ['101'])
    expect(downloadBlobMock.mock.calls[0][1]).toBe(
      'sales-outbound-selected.xlsx',
    )
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
})
