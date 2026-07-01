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
  fetchAttachmentCounts,
  getAttachmentBindings,
  getAttachmentBlob,
  getPresignedAttachmentBlob,
  resolveAttachmentAccessUrl,
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
              0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45,
              0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
              0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
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
      vi.stubGlobal(
        'XMLHttpRequest',
        class {
          status = 200
          statusText = 'OK'
          upload = {}
          open = vi.fn()
          setRequestHeader = vi.fn()
          onload: (() => void) | null = null
          onerror: (() => void) | null = null
          send = vi.fn(() => {
            this.onload?.()
          })
        },
      )

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
      expect(httpPostMock).toHaveBeenNthCalledWith(
        2,
        '/attachments/direct-upload/complete',
        { attachmentId: '1', token: 'token' },
        { params: { moduleKey: 'purchase-order' } },
      )
      expect(result).toEqual({ code: 0, data: { id: '1' } })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('reports direct upload progress through XMLHttpRequest', async () => {
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })
      const progressValues: number[] = []
      httpPostMock
        .mockResolvedValueOnce({
          code: 0,
          data: {
            attachmentId: '1',
            token: 'token',
            uploadUrl: 'https://upload.example.com/test.pdf',
            method: 'PUT',
          },
        })
        .mockResolvedValueOnce({ code: 0, data: { id: '1' } })
      vi.stubGlobal(
        'XMLHttpRequest',
        class {
          status = 200
          statusText = 'OK'
          upload: {
            onprogress?: (event: {
              lengthComputable: boolean
              loaded: number
              total: number
            }) => void
          } = {}
          open = vi.fn()
          setRequestHeader = vi.fn()
          onload: (() => void) | null = null
          onerror: (() => void) | null = null
          send = vi.fn(() => {
            this.upload.onprogress?.({
              lengthComputable: true,
              loaded: 5,
              total: 10,
            })
            this.onload?.()
          })
        },
      )

      await uploadAttachment(file, 'purchase-order', 'PAGE_UPLOAD', {
        onProgress: (percent) => progressValues.push(percent),
      })

      expect(progressValues).toEqual([50, 100])
    })

    it('falls back to multipart upload when direct upload is unsupported', async () => {
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })
      const unsupportedError = Object.assign(
        new Error('当前附件存储不支持直传'),
        {
          response: {
            status: 400,
            data: { message: '当前附件存储不支持直传' },
          },
        },
      )
      httpPostMock
        .mockRejectedValueOnce(unsupportedError)
        .mockResolvedValueOnce({ code: 0, data: { id: '1' } })

      const result = await uploadAttachment(file, 'purchase-order')

      expect(httpPostMock).toHaveBeenCalledWith(
        '/attachments/upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: expect.any(Function),
        }),
      )
      const formData = httpPostMock.mock.calls[1][1] as FormData
      expect(formData.get('file')).toBe(file)
      expect(formData.get('moduleKey')).toBe('purchase-order')
      expect(formData.get('sourceType')).toBe('PAGE_UPLOAD')
      expect(result).toEqual({ code: 0, data: { id: '1' } })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('reports multipart upload progress when direct upload is unsupported', async () => {
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })
      const progressValues: number[] = []
      const unsupportedError = Object.assign(
        new Error('当前附件存储不支持直传'),
        {
          response: {
            status: 400,
            data: { message: '当前附件存储不支持直传' },
          },
        },
      )
      httpPostMock
        .mockRejectedValueOnce(unsupportedError)
        .mockResolvedValueOnce({ code: 0, data: { id: '1' } })

      await uploadAttachment(file, 'purchase-order', 'PAGE_UPLOAD', {
        onProgress: (percent) => progressValues.push(percent),
      })

      const multipartConfig = httpPostMock.mock.calls[1][2] as {
        onUploadProgress?: (event: { loaded: number; total?: number }) => void
      }
      multipartConfig.onUploadProgress?.({ loaded: 7, total: 10 })
      expect(progressValues).toContain(70)
    })

    it('uses custom sourceType', async () => {
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })
      const unsupportedError = Object.assign(
        new Error('当前附件存储不支持直传'),
        {
          response: {
            status: 400,
            data: { message: '当前附件存储不支持直传' },
          },
        },
      )
      httpPostMock
        .mockRejectedValueOnce(unsupportedError)
        .mockResolvedValueOnce({})

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

  describe('fetchAttachmentCounts', () => {
    it('requests attachment counts for current page records', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: { moduleKey: 'purchase-order', counts: { '1': 2, '2': 0 } },
      })

      const result = await fetchAttachmentCounts('purchase-order', [
        '1',
        2,
        '',
        'abc',
      ])

      expect(httpGetMock).toHaveBeenCalledWith('/attachments/bindings/counts', {
        params: {
          moduleKey: 'purchase-order',
          recordIds: '1,2',
        },
      })
      expect(result.data?.counts).toEqual({ '1': 2, '2': 0 })
    })

    it('skips request when there are no valid record ids', async () => {
      const result = await fetchAttachmentCounts('purchase-order', [
        '',
        'abc',
        0,
      ])

      expect(httpGetMock).not.toHaveBeenCalled()
      expect(result.data?.counts).toEqual({})
    })
  })

  describe('resolveAttachmentAccessUrl', () => {
    it('requests presigned preview url with module and access key params', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: {
          inline: true,
          presigned: true,
          url: 'https://cdn.example.com/preview.pdf',
        },
      })

      const result = await resolveAttachmentAccessUrl(
        '/api/attachments/1/preview?accessKey=abc&moduleKey=purchase-order',
        'purchase-order',
        true,
      )

      expect(httpGetMock).toHaveBeenCalledWith('/attachments/1/access-url', {
        params: {
          accessKey: 'abc',
          inline: true,
          moduleKey: 'purchase-order',
        },
      })
      expect(result).toEqual({
        inline: true,
        presigned: true,
        url: 'https://cdn.example.com/preview.pdf',
      })
    })

    it('keeps moduleKey from original url when explicit moduleKey is empty', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: {
          inline: false,
          presigned: true,
          url: 'https://cdn.example.com/download.pdf',
        },
      })

      await resolveAttachmentAccessUrl(
        '/api/attachments/1/download?accessKey=abc&moduleKey=sales-order',
        '',
        false,
      )

      expect(httpGetMock).toHaveBeenCalledWith('/attachments/1/access-url', {
        params: {
          accessKey: 'abc',
          inline: false,
          moduleKey: 'sales-order',
        },
      })
    })

    it('returns original non-backend url without requesting access url', async () => {
      const result = await resolveAttachmentAccessUrl(
        'https://cdn.example.com/file.pdf',
        'purchase-order',
        false,
      )

      expect(result).toEqual({
        inline: false,
        presigned: true,
        url: 'https://cdn.example.com/file.pdf',
      })
      expect(httpGetMock).not.toHaveBeenCalled()
    })

    it('downloads local attachment as blob with auth headers when no presigned url is available', async () => {
      const blob = new Blob(['file'], { type: 'application/pdf' })
      httpGetMock
        .mockResolvedValueOnce({
          code: 0,
          data: {
            inline: true,
            presigned: false,
            url: null,
          },
        })
        .mockResolvedValueOnce(blob)

      const access = await resolveAttachmentAccessUrl(
        '/api/attachments/1/preview?accessKey=abc&moduleKey=purchase-order',
        'purchase-order',
        true,
      )
      const result = await getAttachmentBlob(
        '/api/attachments/1/preview?accessKey=abc&moduleKey=purchase-order',
      )

      expect(access).toEqual({
        inline: true,
        presigned: false,
        url: null,
      })
      expect(result).toBe(blob)
      expect(httpGetMock).toHaveBeenNthCalledWith(2, '/attachments/1/preview', {
        params: {
          accessKey: 'abc',
          moduleKey: 'purchase-order',
        },
        responseType: 'blob',
      })
    })

    it('fetches blob from resolved presigned url for iframe PDF preview', async () => {
      const blob = new Blob(['file'], { type: 'application/pdf' })
      httpGetMock.mockResolvedValue({
        code: 0,
        data: {
          inline: true,
          presigned: true,
          url: 'https://cdn.example.com/preview.pdf',
        },
      })
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        blob: vi.fn().mockResolvedValue(blob),
      })

      const result = await getPresignedAttachmentBlob(
        '/api/attachments/1/preview?accessKey=abc&moduleKey=purchase-order',
        'purchase-order',
        true,
      )

      expect(result).toBe(blob)
      expect(httpGetMock).toHaveBeenCalledWith('/attachments/1/access-url', {
        params: {
          accessKey: 'abc',
          inline: true,
          moduleKey: 'purchase-order',
        },
      })
      expect(fetchMock).toHaveBeenCalledWith(
        'https://cdn.example.com/preview.pdf',
      )
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
