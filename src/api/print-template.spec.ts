import { beforeEach, describe, expect, it, vi } from 'vitest'

const restGetMock = vi.hoisted(() => vi.fn())
const restPostMock = vi.hoisted(() => vi.fn())
const restPutMock = vi.hoisted(() => vi.fn())
const restDeleteMock = vi.hoisted(() => vi.fn())
const httpPostMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { post: httpPostMock },
  restGet: restGetMock,
  restPost: restPostMock,
  restPut: restPutMock,
  restDelete: restDeleteMock,
}))

import {
  deletePrintTemplate,
  exportSalesOrderPrintXlsx,
  listPrintRecordBrands,
  listPrintRecordItems,
  listPrintTemplates,
  savePrintTemplate,
  uploadPrintTemplateJson,
} from './print-template'

describe('print-template', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation((response) => response)
  })

  describe('listPrintTemplates', () => {
    it('fetches templates by bill type', async () => {
      const mockResponse = {
        code: 0,
        data: [
          { id: '1', templateName: '默认模板', billType: 'purchase-order' },
        ],
      }
      restGetMock.mockResolvedValue(mockResponse)

      const result = await listPrintTemplates('purchase-order')

      expect(restGetMock).toHaveBeenCalledWith('/print-templates', {
        billType: 'purchase-order',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('listPrintRecordBrands', () => {
    it('fetches brands by module and record ids', async () => {
      const mockResponse = { code: 0, data: ['抚顺新钢', '沙钢'] }
      restPostMock.mockResolvedValue(mockResponse)

      const result = await listPrintRecordBrands('sales-order', ['1', '2'])

      expect(restPostMock).toHaveBeenCalledWith('/print/brands', {
        moduleKey: 'sales-order',
        recordIds: ['1', '2'],
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('listPrintRecordItems', () => {
    it('fetches print items by module and record ids', async () => {
      const mockResponse = {
        code: 0,
        data: [{ id: '11', brand: '中杭', category: '螺纹钢' }],
      }
      restPostMock.mockResolvedValue(mockResponse)

      const result = await listPrintRecordItems('sales-order', ['1', '2'])

      expect(restPostMock).toHaveBeenCalledWith('/print/items', {
        moduleKey: 'sales-order',
        recordIds: ['1', '2'],
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('exportSalesOrderPrintXlsx', () => {
    it('downloads sales order locked print xlsx as blob', async () => {
      const blob = new Blob(['xlsx'])
      httpPostMock.mockResolvedValue(blob)

      const result = await exportSalesOrderPrintXlsx('id/1', {
        printOptions: {
          hideUnitPrice: true,
          hideRemark: true,
          brandOverridesByItemId: { '11': '抚新' },
          itemOrder: ['12', '11'],
        },
      })

      expect(httpPostMock).toHaveBeenCalledWith(
        '/sales-orders/id%2F1/print-xlsx',
        {
          printOptions: {
            hideUnitPrice: true,
            hideRemark: true,
            brandOverridesByItemId: { '11': '抚新' },
            itemOrder: ['12', '11'],
          },
        },
        {
          responseType: 'blob',
        },
      )
      expect(result).toBe(blob)
    })

    it('sends empty payload when print options are omitted', async () => {
      const blob = new Blob(['xlsx'])
      httpPostMock.mockResolvedValue(blob)

      const result = await exportSalesOrderPrintXlsx('1')

      expect(httpPostMock).toHaveBeenCalledWith(
        '/sales-orders/1/print-xlsx',
        {},
        {
          responseType: 'blob',
        },
      )
      expect(result).toBe(blob)
    })
  })

  describe('savePrintTemplate', () => {
    it('creates new template via POST when no id', async () => {
      const mockResponse = {
        code: 0,
        data: { id: '1', templateName: '新模板' },
      }
      restPostMock.mockResolvedValue(mockResponse)

      const payload = {
        billType: 'purchase-order',
        templateName: '新模板',
        templateHtml: 'LODOP.PRINT_INIT("test");',
      }
      const result = await savePrintTemplate(payload)

      expect(restPostMock).toHaveBeenCalledWith('/print-templates', {
        billType: 'purchase-order',
        templateName: '新模板',
        templateCode: undefined,
        templateHtml: 'LODOP.PRINT_INIT("test");',
        templateType: 'COORD',
        engine: 'LODOP',
        assetRef: undefined,
        versionNo: 1,
        status: 'ACTIVE',
      })
      expect(result).toEqual(mockResponse)
    })

    it('updates existing template via PUT when id exists', async () => {
      const mockResponse = {
        code: 0,
        data: { id: '1', templateName: '更新模板' },
      }
      restPutMock.mockResolvedValue(mockResponse)

      const payload = {
        id: '1',
        billType: 'purchase-order',
        templateName: '更新模板',
        templateHtml: 'LODOP.PRINT_INIT("updated");',
      }
      const result = await savePrintTemplate(payload)

      expect(restPutMock).toHaveBeenCalledWith('/print-templates/1', {
        billType: 'purchase-order',
        templateName: '更新模板',
        templateCode: undefined,
        templateHtml: 'LODOP.PRINT_INIT("updated");',
        templateType: 'COORD',
        engine: 'LODOP',
        assetRef: undefined,
        versionNo: 1,
        status: 'ACTIVE',
      })
      expect(result).toEqual(mockResponse)
    })

    it('defaults templateType to COORD when not provided', async () => {
      restPostMock.mockResolvedValue({ code: 0, data: {} })

      await savePrintTemplate({
        billType: 'test',
        templateName: 'test',
        templateHtml: 'LODOP.PRINT_INIT("test");',
      })

      expect(restPostMock).toHaveBeenCalledWith(
        '/print-templates',
        expect.objectContaining({
          templateType: 'COORD',
          engine: 'LODOP',
        }),
      )
    })

    it('sends PDF_FORM metadata without requiring template html', async () => {
      restPostMock.mockResolvedValue({ code: 0, data: {} })

      await savePrintTemplate({
        billType: 'sales-order',
        templateName: 'PDF 模板',
        templateCode: 'SALES_ORDER_PDF',
        templateHtml: '',
        templateType: 'PDF_FORM',
        versionNo: 2,
        status: 'ACTIVE',
      })

      expect(restPostMock).toHaveBeenCalledWith('/print-templates', {
        billType: 'sales-order',
        templateName: 'PDF 模板',
        templateCode: 'SALES_ORDER_PDF',
        templateHtml: '',
        templateType: 'PDF_FORM',
        engine: 'PDF_FORM',
        assetRef: undefined,
        versionNo: 2,
        status: 'ACTIVE',
      })
    })

    it('encodes id in URL for PUT', async () => {
      restPutMock.mockResolvedValue({ code: 0, data: {} })

      await savePrintTemplate({
        id: 'id with spaces',
        billType: 'test',
        templateName: 'test',
        templateHtml: 'LODOP.PRINT_INIT("test");',
      })

      expect(restPutMock).toHaveBeenCalledWith(
        '/print-templates/id%20with%20spaces',
        expect.any(Object),
      )
    })
  })

  describe('deletePrintTemplate', () => {
    it('deletes template by id', async () => {
      const mockResponse = { code: 0, data: 'deleted' }
      restDeleteMock.mockResolvedValue(mockResponse)

      const result = await deletePrintTemplate('1')

      expect(restDeleteMock).toHaveBeenCalledWith('/print-templates/1')
      expect(result).toEqual(mockResponse)
    })

    it('encodes id in URL', async () => {
      restDeleteMock.mockResolvedValue({ code: 0, data: '' })

      await deletePrintTemplate('id/with/slash')

      expect(restDeleteMock).toHaveBeenCalledWith(
        '/print-templates/id%2Fwith%2Fslash',
      )
    })
  })

  describe('uploadPrintTemplateJson', () => {
    it('uploads json via multipart endpoint', async () => {
      const mockResponse = { code: 0, data: { id: 'tpl-1' } }
      const file = new File(['{}'], 'layout.json', {
        type: 'application/json',
      })
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await uploadPrintTemplateJson('id/with/slash', file)

      expect(httpPostMock).toHaveBeenCalledWith(
        '/print-templates/id%2Fwith%2Fslash/upload-json',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      const formData = httpPostMock.mock.calls[0][1] as FormData
      expect(formData.get('file')).toBe(file)
      expect(assertApiSuccessMock).toHaveBeenCalledWith(
        mockResponse,
        '上传模板 JSON 失败',
      )
      expect(result).toEqual(mockResponse)
    })

    it('throws when upload response has failed business code', async () => {
      const file = new File(['{}'], 'layout.json', {
        type: 'application/json',
      })
      const mockResponse = { code: 4000, message: 'bad json', data: null }
      const error = new Error('bad json')
      httpPostMock.mockResolvedValue(mockResponse)
      assertApiSuccessMock.mockImplementation(() => {
        throw error
      })

      await expect(uploadPrintTemplateJson('tpl-1', file)).rejects.toThrow(
        error,
      )
      expect(assertApiSuccessMock).toHaveBeenCalledWith(
        mockResponse,
        '上传模板 JSON 失败',
      )
    })
  })
})
