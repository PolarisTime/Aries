// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apiPostMock = vi.hoisted(() => vi.fn())
const apiGetMock = vi.hoisted(() => vi.fn())
const apiPutMock = vi.hoisted(() => vi.fn())
const downloadGetMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  apiPut: apiPutMock,
  downloadGet: downloadGetMock,
}))

import { uploadAttachment } from '@/api/business/business-attachments'

function createFile() {
  return new File(['content'], 'test.pdf', { type: 'application/pdf' })
}

describe('uploadAttachment 直传回退', () => {
  beforeEach(() => {
    apiPostMock.mockReset()
    apiGetMock.mockReset()
    apiPutMock.mockReset()
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('后端返回 422 时回退 multipart 并抑制全局错误提示', async () => {
    const unsupported = Object.assign(
      new Error('当前 OSS 设置仅允许后端中转访问'),
      { status: 422 },
    )
    apiPostMock
      .mockRejectedValueOnce(unsupported)
      .mockResolvedValueOnce({ id: '1' })

    const result = await uploadAttachment(createFile(), 'purchase-order')

    expect(result).toEqual({ id: '1' })
    expect(apiPostMock).toHaveBeenCalledTimes(2)
    expect(apiPostMock).toHaveBeenNthCalledWith(
      1,
      '/attachment-upload-sessions',
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        suppressGlobalErrorStatuses: expect.arrayContaining([422]),
      }),
    )
    expect(apiPostMock).toHaveBeenNthCalledWith(
      2,
      '/attachments/upload',
      expect.anything(),
      expect.any(FormData),
      expect.objectContaining({
        suppressGlobalErrorStatuses: expect.arrayContaining([422]),
      }),
    )
  })

  it('后端仅返回“仅允许后端中转访问”文案且无状态码时回退', async () => {
    apiPostMock
      .mockRejectedValueOnce({
        response: {
          data: { message: '当前 OSS 设置仅允许后端中转访问' },
        },
      })
      .mockResolvedValueOnce({ id: '2' })

    await expect(
      uploadAttachment(createFile(), 'purchase-order'),
    ).resolves.toEqual({ id: '2' })
    expect(apiPostMock).toHaveBeenCalledTimes(2)
  })

  it('后端返回业务码 4000 时回退', async () => {
    apiPostMock
      .mockRejectedValueOnce({
        response: {
          status: 422,
          data: { code: 4000, message: '请求参数不合法' },
        },
      })
      .mockResolvedValueOnce({ id: '3' })

    await expect(
      uploadAttachment(createFile(), 'purchase-order'),
    ).resolves.toEqual({ id: '3' })
    expect(apiPostMock).toHaveBeenCalledTimes(2)
  })

  it('兼容“不支持直传”旧文案', async () => {
    apiPostMock
      .mockRejectedValueOnce(new Error('当前附件存储不支持直传'))
      .mockResolvedValueOnce({ id: '4' })

    await expect(
      uploadAttachment(createFile(), 'purchase-order'),
    ).resolves.toEqual({ id: '4' })
    expect(apiPostMock).toHaveBeenCalledTimes(2)
  })

  it('非回退错误原样抛出且不触发 multipart', async () => {
    const error = Object.assign(new Error('服务器内部错误'), { status: 500 })
    apiPostMock.mockRejectedValueOnce(error)

    await expect(uploadAttachment(createFile(), 'purchase-order')).rejects.toBe(
      error,
    )
    expect(apiPostMock).toHaveBeenCalledTimes(1)
  })
})
