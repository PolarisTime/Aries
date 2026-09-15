import { beforeEach, describe, expect, it, vi } from 'vitest'

const { downloadPostResponseMock, apiGetMock } = vi.hoisted(() => ({
  downloadPostResponseMock: vi.fn(),
  apiGetMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiPost: vi.fn(),
  apiDeleteNoContent: vi.fn(),
  apiGet: apiGetMock,
  apiPut: vi.fn(),
  downloadPostResponse: downloadPostResponseMock,
}))

import {
  listPrintRecordItems,
  renderPrintRecord,
} from '@/api/system/print-template'

function printItem(id: string, recordId = '9') {
  return {
    id,
    recordId,
    brand: '泸钢',
    category: '盘螺',
    material: 'HRB400E',
    spec: '8',
    length: '-',
    quantity: '1',
    pieceWeightTon: '1.000',
    weightTon: '1.000',
    unitPrice: '1.00',
    amount: '1.00',
  }
}

function printItemsPage(
  content: ReturnType<typeof printItem>[],
  totalPages: number,
  currentPage: number,
) {
  return {
    content,
    totalElements: totalPages * 200,
    totalPages,
    currentPage,
    pageSize: 200,
    hasMore: currentPage < totalPages - 1,
  }
}

describe('打印明细分页拉全', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('按总页数拉全，避免只取首页导致批量打印静默少打', async () => {
    apiGetMock
      .mockResolvedValueOnce(printItemsPage([printItem('1')], 2, 0))
      .mockResolvedValueOnce(printItemsPage([printItem('2')], 2, 1))

    const items = await listPrintRecordItems('sales-order', ['9'])

    expect(items.map((item) => item.id)).toEqual(['1', '2'])
    expect(apiGetMock).toHaveBeenCalledTimes(2)
    expect(apiGetMock.mock.calls[1][2].params).toMatchObject({
      page: 1,
      size: 200,
      moduleKey: 'sales-order',
      recordIds: '9',
    })
  })

  it('单页响应只请求一次', async () => {
    apiGetMock.mockResolvedValueOnce(printItemsPage([printItem('1')], 1, 0))

    const items = await listPrintRecordItems('sales-order', ['9'])

    expect(items).toHaveLength(1)
    expect(apiGetMock).toHaveBeenCalledTimes(1)
  })
})

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
