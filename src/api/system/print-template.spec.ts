import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ZodType } from 'zod'
import { parseApiContract } from '@/api/core/api-contract'

const { apiPostMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiPost: apiPostMock,
  apiDeleteNoContent: vi.fn(),
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  downloadPostResponse: vi.fn(),
}))

import { renderPrintRecord } from '@/api/system/print-template'

describe('打印输出响应契约', () => {
  beforeEach(() => {
    apiPostMock.mockReset()
  })

  it('接受 PDF 输出中未使用字段为 null 的后端响应', async () => {
    apiPostMock.mockImplementation(
      (_url: string, schema: ZodType, _payload: unknown) =>
        Promise.resolve(
          parseApiContract(
            schema,
            {
              kind: 'PDF',
              templateName: '销售订单 PDF',
              templateType: 'PDF_FORM',
              contentType: 'application/pdf',
              fileName: 'SO-001.pdf',
              pdfBase64: 'JVBERi0=',
              businessNo: 'SO-001',
              recordId: '123456789012345678',
              moduleKey: 'sales-order',
              templateHtml: null,
              data: null,
              items: null,
            },
            'POST /print-outputs',
          ),
        ),
    )

    await expect(
      renderPrintRecord('template-1', 'sales-order', '123456789012345678'),
    ).resolves.toMatchObject({
      kind: 'PDF',
      pdfBase64: 'JVBERi0=',
    })
  })
})
