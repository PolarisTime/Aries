import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiPostMock, downloadGetMock, downloadBlobMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  downloadGetMock: vi.fn(),
  downloadBlobMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiPost: apiPostMock,
  downloadGet: downloadGetMock,
}))

vi.mock('@/utils/download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/download')>()
  return { ...actual, downloadBlob: downloadBlobMock }
})

import {
  createAndDownloadExportArtifact,
  createExportArtifact,
  downloadExportArtifact,
  exportArtifactSchema,
} from '@/api/core/export-artifacts'

/** 后端 `ExportArtifactResponse` 的样例：id 是十进制字符串，size 是字节数。 */
const ARTIFACT = {
  id: '700000000000000001',
  kind: 'CASH_LEDGER_EXPORT',
  fileName: '资金流水.xlsx',
  contentType:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  size: 2048,
  createdAt: '2026-11-15T00:00:00Z',
  expiresAt: '2026-11-15T00:30:00Z',
  contentPath: '/v2.0/cash-ledger-export-requests/700000000000000001/content',
}

describe('exportArtifactSchema 契约', () => {
  it('雪花 id 必须是字符串, size 必须是 number', () => {
    expect(exportArtifactSchema.parse(ARTIFACT)).toMatchObject({
      id: '700000000000000001',
      size: 2048,
    })

    // 19 位雪花 id 若被数值化会丢精度，契约层必须直接拒绝（这里刻意构造数值形态）
    expect(() =>
      exportArtifactSchema.parse({
        ...ARTIFACT,
        id: Number('700000000000000001'),
      }),
    ).toThrow()
    // size 是字节数（远小于 2^53-1），后端保持 JSON number
    expect(() =>
      exportArtifactSchema.parse({ ...ARTIFACT, size: '2048' }),
    ).toThrow()
  })
})

describe('createExportArtifact 创建导出资源', () => {
  beforeEach(() => {
    apiPostMock.mockReset()
    apiPostMock.mockResolvedValue(ARTIFACT)
  })

  it('POST 资源集合路径并带非空幂等键', async () => {
    const artifact = await createExportArtifact(
      '/cash-ledger-export-requests',
      { settlementCompanyId: '42' },
    )

    expect(artifact).toEqual(ARTIFACT)
    const [url, , body, config] = apiPostMock.mock.calls[0]
    expect(url).toBe('/cash-ledger-export-requests')
    expect(body).toEqual({ settlementCompanyId: '42' })
    const idempotencyKey = (config as { headers: Record<string, string> })
      .headers['X-Idempotency-Key']
    expect(typeof idempotencyKey).toBe('string')
    expect(idempotencyKey.length).toBeGreaterThan(0)
  })

  it('同一次用户动作可复用调用方给定的幂等键', async () => {
    await createExportArtifact(
      '/cash-ledger-export-requests',
      { settlementCompanyId: '42' },
      { idempotencyKey: 'cash-ledger-export-key' },
    )

    expect(
      (apiPostMock.mock.calls[0][3] as { headers: Record<string, string> })
        .headers,
    ).toMatchObject({ 'X-Idempotency-Key': 'cash-ledger-export-key' })
  })
})

describe('downloadExportArtifact 读取产物内容', () => {
  beforeEach(() => {
    downloadGetMock.mockReset()
    downloadBlobMock.mockReset()
    downloadGetMock.mockResolvedValue(new Blob(['xlsx']))
  })

  it('按 baseURL 相对路径请求 content（剥掉 /v2.0 版本前缀）', async () => {
    await downloadExportArtifact(ARTIFACT, 'fallback.xlsx')

    // baseURL 已是 /api/v2.0，contentPath 自带 /v2.0 前缀，拼接前必须剥掉
    expect(downloadGetMock.mock.calls[0][0]).toBe(
      '/cash-ledger-export-requests/700000000000000001/content',
    )
    // Authorization 由统一 client 的请求拦截器注入，这里不得覆盖请求头
    expect(downloadGetMock.mock.calls[0][1]).toBeUndefined()
    expect(downloadBlobMock.mock.calls[0][1]).toBe('资金流水.xlsx')
  })

  it('没有版本前缀的 contentPath 原样请求', async () => {
    await downloadExportArtifact(
      { ...ARTIFACT, contentPath: '/module-export-requests/1/content' },
      'fallback.xlsx',
    )

    expect(downloadGetMock.mock.calls[0][0]).toBe(
      '/module-export-requests/1/content',
    )
  })

  it('产物已给出文件名时忽略兜底名', async () => {
    await downloadExportArtifact(
      { ...ARTIFACT, fileName: '  资金流水(2026-11).xlsx  ' },
      'fallback.xlsx',
    )

    expect(downloadBlobMock.mock.calls[0][1]).toBe('资金流水(2026-11).xlsx')
  })

  it('404 视为产物过期, 提示重新生成且不落盘', async () => {
    downloadGetMock.mockRejectedValue(
      Object.assign(new Error('Not Found'), { status: 404 }),
    )

    await expect(
      downloadExportArtifact(ARTIFACT, 'fallback.xlsx'),
    ).rejects.toThrow('导出文件已过期')
    expect(downloadBlobMock).not.toHaveBeenCalled()
  })

  it('非 404 错误原样抛出（不吞掉权限/网络错误）', async () => {
    const forbidden = Object.assign(new Error('拒绝访问'), { status: 403 })
    downloadGetMock.mockRejectedValue(forbidden)

    await expect(
      downloadExportArtifact(ARTIFACT, 'fallback.xlsx'),
    ).rejects.toThrow('拒绝访问')
  })

  it('contentPath 缺失时提示重新生成', async () => {
    await expect(
      downloadExportArtifact(
        { ...ARTIFACT, contentPath: '  ' },
        'fallback.xlsx',
      ),
    ).rejects.toThrow('导出文件缺少内容地址')
    expect(downloadGetMock).not.toHaveBeenCalled()
  })
})

describe('createAndDownloadExportArtifact 两步导出', () => {
  beforeEach(() => {
    apiPostMock.mockReset()
    downloadGetMock.mockReset()
    downloadBlobMock.mockReset()
    apiPostMock.mockResolvedValue(ARTIFACT)
    downloadGetMock.mockResolvedValue(new Blob(['xlsx']))
  })

  it('先创建再下载, 并返回产物元数据', async () => {
    const artifact = await createAndDownloadExportArtifact(
      '/cash-ledger-export-requests',
      { settlementCompanyId: '42' },
      { fallbackFileName: '资金流水.xlsx' },
    )

    expect(artifact).toEqual(ARTIFACT)
    expect(apiPostMock).toHaveBeenCalledTimes(1)
    expect(downloadGetMock).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock).toHaveBeenCalledTimes(1)
  })

  it('创建失败时不发起下载', async () => {
    apiPostMock.mockRejectedValue(
      Object.assign(new Error('导出行数超过上限'), { status: 422 }),
    )

    await expect(
      createAndDownloadExportArtifact(
        '/cash-ledger-export-requests',
        { settlementCompanyId: '42' },
        { fallbackFileName: '资金流水.xlsx' },
      ),
    ).rejects.toThrow('导出行数超过上限')
    expect(downloadGetMock).not.toHaveBeenCalled()
  })
})
