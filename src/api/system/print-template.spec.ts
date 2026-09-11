import { beforeEach, describe, expect, it, vi } from 'vitest'

const { downloadPostResponseMock } = vi.hoisted(() => ({
  downloadPostResponseMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiPost: vi.fn(),
  apiDeleteNoContent: vi.fn(),
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  downloadPostResponse: downloadPostResponseMock,
}))

import { renderPrintRecord } from '@/api/system/print-template'

describe('打印导出响应契约', () => {
  beforeEach(() => {
    downloadPostResponseMock.mockReset()
  })

  it('接受 JSON 输出中未使用字段为 null 的后端响应', async () => {
    downloadPostResponseMock.mockResolvedValue({
      data: new Blob(
        [
          JSON.stringify({
            kind: 'LODOP_SCRIPT',
            templateName: '销售订单套打',
            templateType: 'COORD',
            businessNo: 'SO-001',
            recordId: '123456789012345678',
            moduleKey: 'sales-order',
            templateHtml: '<html></html>',
            data: null,
            items: null,
          }),
        ],
        { type: 'application/json' },
      ),
      headers: { 'content-type': 'application/json' },
    })

    await expect(
      renderPrintRecord('template-1', 'sales-order', '123456789012345678'),
    ).resolves.toMatchObject({
      kind: 'LODOP_SCRIPT',
      templateHtml: '<html></html>',
    })
  })

  it('将 PDF 二进制响应转换为 pdfBase64', async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    downloadPostResponseMock.mockResolvedValue({
      data: new Blob([bytes], { type: 'application/pdf' }),
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="SO-001.pdf"',
      },
    })

    await expect(
      renderPrintRecord('template-1', 'sales-order', '123456789012345678'),
    ).resolves.toMatchObject({
      kind: 'PDF',
      contentType: 'application/pdf',
      fileName: 'SO-001.pdf',
      pdfBase64: btoa('%PDF'),
    })
  })
})
