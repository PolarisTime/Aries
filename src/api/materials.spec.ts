import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const httpPostMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())
const downloadBlobMock = vi.hoisted(() => vi.fn())

vi.mock('./client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock, post: httpPostMock },
}))

vi.mock('@/constants/endpoints', () => ({
  ENDPOINTS: {
    MATERIALS_SEARCH: '/materials/search',
    MATERIALS_TEMPLATE: '/materials/template',
    MATERIALS_IMPORT: '/materials/import',
  },
}))

vi.mock('@/utils/download', () => ({
  downloadBlob: downloadBlobMock,
}))

import {
  downloadMaterialImportTemplate,
  fetchMaterialSearch,
  importMaterialFile,
} from './materials'

describe('materials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  describe('fetchMaterialSearch', () => {
    it('fetches materials with keyword and limit', async () => {
      const mockData = {
        code: 0,
        data: [
          { id: '1', materialCode: 'M001', brand: '品牌A' },
          { id: '2', materialCode: 'M002', brand: '品牌B' },
        ],
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await fetchMaterialSearch('test', 50)

      expect(httpGetMock).toHaveBeenCalledWith('/materials/search', {
        params: { keyword: 'test', limit: 50 },
      })
      expect(result).toHaveLength(2)
    })

    it('returns empty array on non-zero code', async () => {
      httpGetMock.mockResolvedValue({ code: -1, data: null })

      const result = await fetchMaterialSearch()

      expect(result).toEqual([])
    })

    it('returns empty array when data is not array', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: null })

      const result = await fetchMaterialSearch()

      expect(result).toEqual([])
    })

    it('uses default parameters', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: [] })

      await fetchMaterialSearch()

      expect(httpGetMock).toHaveBeenCalledWith('/materials/search', {
        params: { keyword: '', limit: 200 },
      })
    })
  })

  describe('downloadMaterialImportTemplate', () => {
    it('downloads template as blob', async () => {
      const mockBlob = new Blob(['template'])
      httpGetMock.mockResolvedValue(mockBlob)

      await downloadMaterialImportTemplate()

      expect(httpGetMock).toHaveBeenCalledWith('/materials/template', {
        responseType: 'blob',
      })
      expect(downloadBlobMock).toHaveBeenCalledWith(
        mockBlob,
        '商品资料导入模板.xlsx',
      )
    })
  })

  describe('importMaterialFile', () => {
    it('uploads file via FormData', async () => {
      const mockResponse = {
        code: 0,
        data: {
          totalRows: 10,
          successCount: 8,
          createdCount: 5,
          updatedCount: 3,
          failCount: 2,
          errors: [],
        },
      }
      httpPostMock.mockResolvedValue(mockResponse)

      const file = new File(['data'], 'materials.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const result = await importMaterialFile(file)

      expect(httpPostMock).toHaveBeenCalledWith(
        '/materials/import',
        expect.any(FormData),
      )
      expect(result.totalRows).toBe(10)
    })
  })
})
