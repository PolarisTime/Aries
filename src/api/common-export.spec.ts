import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpPostMock = vi.hoisted(() => vi.fn())
const getModuleConfigMock = vi.hoisted(() => vi.fn())
const buildFilterParamsMock = vi.hoisted(() => vi.fn())
const downloadBlobMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  http: { instance: { post: httpPostMock } },
}))

vi.mock('@/api/module-contracts', () => ({
  getModuleConfig: getModuleConfigMock,
}))

vi.mock('@/api/business-listing-filtering', () => ({
  buildFilterParams: buildFilterParamsMock,
}))

vi.mock('@/utils/download', () => ({
  downloadBlob: downloadBlobMock,
}))

import { exportModuleData } from './common-export'

describe('common-export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getModuleConfigMock.mockReturnValue({ path: '/purchase-orders' })
    buildFilterParamsMock.mockReturnValue({ keyword: 'test' })
  })

  it('exports module data as blob', async () => {
    const mockBlob = new Blob(['data'])
    httpPostMock.mockResolvedValue({ data: mockBlob })

    await exportModuleData('purchase-order', { keyword: 'test' })

    expect(getModuleConfigMock).toHaveBeenCalledWith('purchase-order')
    expect(buildFilterParamsMock).toHaveBeenCalledWith('purchase-order', {
      keyword: 'test',
    })
    expect(httpPostMock).toHaveBeenCalledWith(
      '/purchase-orders/export',
      { keyword: 'test' },
      {
        params: { keyword: 'test' },
        responseType: 'blob',
      },
    )
    expect(downloadBlobMock).toHaveBeenCalledWith(
      mockBlob,
      'purchase-order.xlsx',
    )
  })

  it('throws when module is not configured', async () => {
    getModuleConfigMock.mockImplementation(() => {
      throw new Error('moduleNotConfigured: invalid-module')
    })

    await expect(exportModuleData('invalid-module', {})).rejects.toThrow(
      'moduleNotConfigured: invalid-module',
    )
  })
})
