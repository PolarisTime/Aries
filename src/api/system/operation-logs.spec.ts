import { describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ apiGet: vi.fn() }))

vi.mock('@/api/core/client', () => client)

import { fetchOperationLogSummary, fetchOperationLogs } from './operation-logs'

const rawLog = {
  id: '373922191017771008',
  logNo: 'OP373922191017771008',
  operatorName: '张三',
  loginName: 'zhangsan',
  moduleName: '供应商报价表',
  actionType: '修改',
  requestMethod: 'PUT',
  requestPath: '/api/v2.0/supplier-price-lists/1/items',
  resultStatus: '失败',
  operationTime: '2026-10-28T10:00:00',
  statusCode: '409',
  durationMs: '1200',
  errorCode: '4090',
  errorMessage: '库存不足',
  requestBody: { password: '***' },
  operationCategory: 'BUSINESS',
  traceId: 'trace-1',
}

describe('操作日志客户端', () => {
  it('分页查询把筛选条件映射成后端参数，并规范化数字/ID', async () => {
    client.apiGet.mockReset().mockResolvedValue({
      content: [rawLog],
      totalElements: '2',
      totalPages: '1',
      currentPage: '0',
      pageSize: '30',
      hasMore: false,
    })

    const page = await fetchOperationLogs({
      page: 0,
      size: 30,
      keyword: 'x',
      operatorName: '张三',
      businessNo: 'SUP-1',
      category: 'BUSINESS',
      minDurationMs: 500,
      startTime: '2026-10-01',
      endTime: '2026-10-28',
      sortBy: 'operationTime',
      direction: 'desc',
    })

    expect(client.apiGet).toHaveBeenCalledWith(
      '/operation-logs',
      expect.anything(),
      expect.objectContaining({
        params: expect.objectContaining({
          keyword: 'x',
          operatorName: '张三',
          businessNo: 'SUP-1',
          category: 'BUSINESS',
          minDurationMs: 500,
          startTime: '2026-10-01',
          endTime: '2026-10-28',
          page: 0,
          size: 30,
          sortBy: 'operationTime',
          direction: 'desc',
        }),
      }),
    )
    expect(page.totalElements).toBe(2)
    expect(page.content[0]).toMatchObject({
      id: '373922191017771008',
      statusCode: 409,
      durationMs: 1200,
      errorCode: '4090',
      errorMessage: '库存不足',
      operationCategory: 'BUSINESS',
    })
  })

  it('概览接口返回指标/趋势/失败模块，缺字段按 0 兜底', async () => {
    client.apiGet.mockReset().mockResolvedValue({
      total: '10',
      successCount: '9',
      failedCount: '1',
      avgDurationMs: '123.4',
      byDay: [{ date: '2026-10-28', total: '2', failed: '1' }],
      topFailedModules: [{ moduleName: '供应商报价表', count: '1' }],
    })

    const summary = await fetchOperationLogSummary({ resultStatus: '失败' })

    expect(client.apiGet).toHaveBeenCalledWith(
      '/operation-logs/summary',
      expect.anything(),
      expect.objectContaining({ params: { resultStatus: '失败' } }),
    )
    expect(summary).toEqual({
      total: 10,
      successCount: 9,
      failedCount: 1,
      avgDurationMs: 123.4,
      byDay: [{ date: '2026-10-28', total: 2, failed: 1 }],
      topFailedModules: [{ moduleName: '供应商报价表', count: 1 }],
    })
  })
})
