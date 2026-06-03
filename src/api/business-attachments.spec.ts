import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpPostMock = vi.hoisted(() => vi.fn())
const httpGetMock = vi.hoisted(() => vi.fn())
const httpPutMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  http: {
    post: httpPostMock,
    get: httpGetMock,
    put: httpPutMock,
  },
}))

import {
  uploadAttachment,
  getAttachmentBindings,
  updateAttachmentBindings,
  updatePageUploadRule,
} from './business-attachments'

describe('business-attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadAttachment', () => {
    it('sends form-data with file, moduleKey and sourceType', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      httpPostMock.mockResolvedValue({ code: 0, data: { id: '1' } })

      const result = await uploadAttachment(file, 'purchase-order')

      expect(httpPostMock).toHaveBeenCalledWith(
        '/attachments/upload',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      const formData = httpPostMock.mock.calls[0][1] as FormData
      expect(formData.get('file')).toBe(file)
      expect(formData.get('moduleKey')).toBe('purchase-order')
      expect(formData.get('sourceType')).toBe('PAGE_UPLOAD')
      expect(result).toEqual({ code: 0, data: { id: '1' } })
    })

    it('uses custom sourceType', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      httpPostMock.mockResolvedValue({})

      await uploadAttachment(file, 'sales-order', 'CUSTOM_UPLOAD')

      const formData = httpPostMock.mock.calls[0][1] as FormData
      expect(formData.get('sourceType')).toBe('CUSTOM_UPLOAD')
    })
  })

  describe('getAttachmentBindings', () => {
    it('correctly calls GET with params', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: { attachments: [] } })

      const result = await getAttachmentBindings('purchase-order', '123')

      expect(httpGetMock).toHaveBeenCalledWith('/attachments/bindings', {
        params: { moduleKey: 'purchase-order', recordId: '123' },
      })
      expect(result).toEqual({ code: 0, data: { attachments: [] } })
    })

    it('works with numeric recordId', async () => {
      httpGetMock.mockResolvedValue({})
      await getAttachmentBindings('sales-order', 456)
      expect(httpGetMock).toHaveBeenCalledWith('/attachments/bindings', {
        params: { moduleKey: 'sales-order', recordId: 456 },
      })
    })
  })

  describe('updateAttachmentBindings', () => {
    it('sends PUT with normalized attachmentIds', async () => {
      httpPutMock.mockResolvedValue({ code: 0 })

      await updateAttachmentBindings('purchase-order', '123', ['1', '2', '3'])

      expect(httpPutMock).toHaveBeenCalledWith('/attachments/bindings', {
        moduleKey: 'purchase-order',
        recordId: '123',
        attachmentIds: ['1', '2', '3'],
      })
    })

    it('filters out invalid attachment IDs', async () => {
      httpPutMock.mockResolvedValue({})

      await updateAttachmentBindings('test', '1', ['0', 'abc', '', '  ', '5'])

      expect(httpPutMock).toHaveBeenCalledWith(
        '/attachments/bindings',
        expect.objectContaining({
          attachmentIds: ['5'],
        }),
      )
    })

    it('returns empty array when no valid IDs', async () => {
      httpPutMock.mockResolvedValue({})

      await updateAttachmentBindings('test', '1', ['0', 'abc', ''])

      expect(httpPutMock).toHaveBeenCalledWith(
        '/attachments/bindings',
        expect.objectContaining({
          attachmentIds: [],
        }),
      )
    })
  })

  describe('updatePageUploadRule', () => {
    it('sends PUT with upload rule payload', async () => {
      httpPutMock.mockResolvedValue({ code: 0 })

      const payload = { renamePattern: '{date}-{name}', status: '正常' }
      await updatePageUploadRule('purchase-order', payload)

      expect(httpPutMock).toHaveBeenCalledWith(
        '/general-setting/upload-rule',
        payload,
        { params: { moduleKey: 'purchase-order' } },
      )
    })
  })
})
