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

import { exportSalesOrderPrintXlsx } from '@/api/business/sales-order-xlsx-export'
import { ENDPOINTS } from '@/constants/endpoints'

const ORDER_ID = '123456789012345678'
const EXPORT_ID = '700000000000000002'

function salesOrderExportArtifact(fileName = '销售订单套打.xlsx') {
  return {
    id: EXPORT_ID,
    kind: 'SALES_ORDER_XLSX_EXPORT',
    fileName,
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 4096,
    createdAt: '2026-11-15T00:00:00Z',
    expiresAt: '2026-11-15T00:30:00Z',
    contentPath: `/v2.0/sales-orders/${ORDER_ID}/xlsx-export-requests/${EXPORT_ID}/content`,
  }
}

describe('exportSalesOrderPrintXlsx 套打导出资源', () => {
  beforeEach(() => {
    apiPostMock.mockReset()
    downloadGetMock.mockReset()
    downloadBlobMock.mockReset()
    apiPostMock.mockResolvedValue(salesOrderExportArtifact())
    downloadGetMock.mockResolvedValue(new Blob(['xlsx']))
  })

  it('POST 到订单的子资源集合, 再 GET 内容端点下载', async () => {
    await exportSalesOrderPrintXlsx(ORDER_ID, {
      printOptions: { hideUnitPrice: true },
    })

    const [url, , body, config] = apiPostMock.mock.calls[0]
    expect(url).toBe(`/sales-orders/${ORDER_ID}/xlsx-export-requests`)
    expect(url).toBe(ENDPOINTS.SALES_ORDER_XLSX_EXPORT_REQUESTS(ORDER_ID))
    // 订单 id 必须是字符串原样进入路径，不做数值转换
    expect(String(url)).toContain(ORDER_ID)
    expect(body).toEqual({ printOptions: { hideUnitPrice: true } })
    expect(
      (config as { headers: Record<string, string> }).headers,
    ).toMatchObject({ 'X-Idempotency-Key': expect.any(String) })

    expect(downloadGetMock.mock.calls[0][0]).toBe(
      `/sales-orders/${ORDER_ID}/xlsx-export-requests/${EXPORT_ID}/content`,
    )
    expect(downloadBlobMock.mock.calls[0][1]).toBe('销售订单套打.xlsx')
  })

  it('打印选项可省略（后端默认打印选项）', async () => {
    await exportSalesOrderPrintXlsx(ORDER_ID)

    expect(apiPostMock.mock.calls[0][2]).toEqual({})
  })

  it('产物无文件名时用订单 id 兜底', async () => {
    apiPostMock.mockResolvedValue(salesOrderExportArtifact(''))

    await exportSalesOrderPrintXlsx(ORDER_ID)

    expect(downloadBlobMock.mock.calls[0][1]).toBe(
      `sales-order-print-${ORDER_ID}.xlsx`,
    )
  })

  it('产物过期（404）时提示重新生成', async () => {
    downloadGetMock.mockRejectedValue(
      Object.assign(new Error('Not Found'), { status: 404 }),
    )

    await expect(exportSalesOrderPrintXlsx(ORDER_ID)).rejects.toThrow(
      '导出文件已过期',
    )
    expect(downloadBlobMock).not.toHaveBeenCalled()
  })
})
