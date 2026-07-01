import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpPostMock = vi.hoisted(() => vi.fn())
const httpGetMock = vi.hoisted(() => vi.fn())
const httpPutMock = vi.hoisted(() => vi.fn())
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  http: {
    post: httpPostMock,
    get: httpGetMock,
    put: httpPutMock,
  },
}))

import {
  getAttachmentBindings,
  updateAttachmentBindings,
  updatePageUploadRule,
  uploadAttachment,
} from './business-attachments'

describe('business-attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi
          .fn()
          .mockResolvedValue(
            new Uint8Array([
              0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23,
              0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67,
              0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
              0xcd, 0xef,
            ]).buffer,
          ),
      },
    })
    fetchMock.mockResolvedValue({ ok: true, status: 200, statusText: 'OK' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('uploadAttachment', () => {
    it('uploads directly with presigned URL and completes attachment metadata', async () => {
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })
      httpPostMock
        .mockResolvedValueOnce({
          code: 0,
          data: {
            attachmentId: '1',
            token: 'token',
            uploadUrl: 'https://upload.example.com/test.pdf',
            method: 'PUT',
            headers: {
              'Content-Type': 'application/pdf',
              'x-amz-checksum-sha256':
                'ASNFZ4mrze8BI0VniavN7wEjRWeJq83vASNFZ4mrze8=',
            },
          },
        })
        .mockResolvedValueOnce({ code: 0, data: { id: '1' } })

      const result = await uploadAttachment(file, 'purchase-order')

      expect(httpPostMock).toHaveBeenNthCalledWith(
        1,
        '/attachments/direct-upload/prepare',
        {
          fileName: 'test.pdf',
          contentType: 'application/pdf',
          fileSize: file.size,
          sourceType: 'PAGE_UPLOAD',
          sha256Hex:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        },
        { params: { moduleKey: 'purchase-order' } },
      )
      expect(fetchMock).toHaveBeenCalledWith(
        'https://upload.example.com/test.pdf',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/pdf',
            'x-amz-checksum-sha256':
              'ASNFZ4mrze8BI0VniavN7wEjRWeJq83vASNFZ4mrze8=',
          },
          body: file,
        },
      )
      expect(httpPostMock).toHaveBeenNthCalledWith(
        2,
        '/attachments/direct-upload/complete',
        { attachmentId: '1', token: 'token' },
        { params: { moduleKey: 'purchase-order' } },
      )
      expect(result).toEqual({ code: 0, data: { id: '1' } })
    })

    it('falls back to multipart upload when direct upload is unsupported', async () => {
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })
      const unsupportedError = Object.assign(new Error('当前附件存储不支持直传'), {
        response: { status: 400, data: { message: '当前附件存储不支持直传' } },
      })
      httpPostMock
        .mockRejectedValueOnce(unsupportedError)
        .mockResolvedValueOnce({ code: 0, data: { id: '1' } })

      const result = await uploadAttachment(file, 'purchase-order')

      expect(httpPostMock).toHaveBeenCalledWith(
        '/attachments/upload',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      const formData = httpPostMock.mock.calls[1][1] as FormData
      expect(formData.get('file')).toBe(file)
      expect(formData.get('moduleKey')).toBe('purchase-order')
      expect(formData.get('sourceType')).toBe('PAGE_UPLOAD')
      expect(result).toEqual({ code: 0, data: { id: '1' } })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('uses custom sourceType', async () => {
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })
      const unsupportedError = Object.assign(new Error('当前附件存储不支持直传'), {
        response: { status: 400, data: { message: '当前附件存储不支持直传' } },
      })
      httpPostMock.mockRejectedValueOnce(unsupportedError).mockResolvedValueOnce({})

      await uploadAttachment(file, 'sales-order', 'CUSTOM_UPLOAD')

      const formData = httpPostMock.mock.calls[1][1] as FormData
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
