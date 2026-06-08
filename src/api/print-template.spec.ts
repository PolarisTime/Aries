import { beforeEach, describe, expect, it, vi } from 'vitest'

const restGetMock = vi.hoisted(() => vi.fn())
const restPostMock = vi.hoisted(() => vi.fn())
const restPutMock = vi.hoisted(() => vi.fn())
const restDeleteMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  restGet: restGetMock,
  restPost: restPostMock,
  restPut: restPutMock,
  restDelete: restDeleteMock,
}))

import {
  deletePrintTemplate,
  listPrintTemplates,
  savePrintTemplate,
} from './print-template'

describe('print-template', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
        templateHtml: '<div>test</div>',
      }
      const result = await savePrintTemplate(payload)

      expect(restPostMock).toHaveBeenCalledWith('/print-templates', {
        billType: 'purchase-order',
        templateName: '新模板',
        templateCode: undefined,
        templateHtml: '<div>test</div>',
        templateType: 'HTML',
        engine: 'BROWSER_HTML',
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
        templateHtml: '<div>updated</div>',
      }
      const result = await savePrintTemplate(payload)

      expect(restPutMock).toHaveBeenCalledWith('/print-templates/1', {
        billType: 'purchase-order',
        templateName: '更新模板',
        templateCode: undefined,
        templateHtml: '<div>updated</div>',
        templateType: 'HTML',
        engine: 'BROWSER_HTML',
        assetRef: undefined,
        versionNo: 1,
        status: 'ACTIVE',
      })
      expect(result).toEqual(mockResponse)
    })

    it('defaults templateType to HTML when not provided', async () => {
      restPostMock.mockResolvedValue({ code: 0, data: {} })

      await savePrintTemplate({
        billType: 'test',
        templateName: 'test',
        templateHtml: '<div/>',
      })

      expect(restPostMock).toHaveBeenCalledWith(
        '/print-templates',
        expect.objectContaining({
          templateType: 'HTML',
          engine: 'BROWSER_HTML',
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
        assetRef: 'print-forms/yingjie-a4-remark.pdf',
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
        assetRef: 'print-forms/yingjie-a4-remark.pdf',
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
        templateHtml: '<div/>',
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
})
