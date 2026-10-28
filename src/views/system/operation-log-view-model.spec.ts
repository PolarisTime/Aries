import { describe, expect, it } from 'vitest'
import type { OperationLogRecord } from '@/api/system/operation-logs'
import {
  applyQuickFilter,
  buildCsv,
  categoryOf,
  failureSummary,
  fillTrend,
  formatDuration,
  isFailure,
  relativeTimeParts,
} from './operation-log-view-model'

const base: OperationLogRecord = {
  id: '1',
  logNo: 'OP1',
  operatorName: '张三',
  loginName: 'zhangsan',
  moduleName: '供应商报价表',
  actionType: '修改',
  requestMethod: 'PUT',
  requestPath: '/api/v2.0/supplier-price-lists/1/items',
  resultStatus: '成功',
  operationTime: '2026-10-28T10:00:00',
}

const record = (patch: Partial<OperationLogRecord>): OperationLogRecord => ({
  ...base,
  ...patch,
})

describe('时间与耗时格式化', () => {
  it('相对时间只返回数值+单位（由 i18n 组装文案）', () => {
    const now = new Date('2026-10-28T10:00:00')
    expect(relativeTimeParts('2026-10-28T09:57:00', now)).toEqual({
      value: -3,
      unit: 'minute',
    })
    expect(relativeTimeParts('2026-10-28T08:00:00', now)).toEqual({
      value: -2,
      unit: 'hour',
    })
    expect(relativeTimeParts('not-a-date', now)).toBeNull()
  })

  it('耗时 <1s 用 ms，>=1s 用 s，缺失返回 null', () => {
    expect(formatDuration(320)).toBe('320 ms')
    expect(formatDuration(1250)).toBe('1.3 s')
    expect(formatDuration(undefined)).toBeNull()
  })
})

describe('结果与类别', () => {
  it('只有「成功」算成功', () => {
    expect(isFailure(record({ resultStatus: '成功' }))).toBe(false)
    expect(isFailure(record({ resultStatus: '失败' }))).toBe(true)
  })

  it('类别优先用后端字段，历史数据按路径兜底', () => {
    expect(categoryOf(record({ operationCategory: 'SESSION' }))).toBe('SESSION')
    expect(
      categoryOf(
        record({
          operationCategory: undefined,
          requestPath: '/api/v2.0/auth/login',
        }),
      ),
    ).toBe('SESSION')
    expect(
      categoryOf(
        record({
          operationCategory: undefined,
          moduleName: 'V2SystemConfig',
          requestPath: '/api/v2.0/system/config',
        }),
      ),
    ).toBe('SYSTEM')
    expect(
      categoryOf(
        record({
          operationCategory: undefined,
          requestPath: '/api/v2.0/materials',
        }),
      ),
    ).toBe('BUSINESS')
  })

  it('失败原因优先 errorCode+message，其次 remark，最后 HTTP 状态', () => {
    expect(
      failureSummary(
        record({
          resultStatus: '失败',
          errorCode: '4090',
          errorMessage: '库存不足',
        }),
      ),
    ).toBe('4090: 库存不足')
    expect(
      failureSummary(record({ resultStatus: '失败', remark: '请求处理失败' })),
    ).toBe('请求处理失败')
    expect(
      failureSummary(record({ resultStatus: '失败', statusCode: 500 })),
    ).toBe('HTTP 500')
    expect(failureSummary(base)).toBeNull()
  })
})

describe('快捷筛选', () => {
  it('仅失败/今日/我的操作各自覆盖对应条件，并清掉其它快捷条件', () => {
    const context = { today: '2026-10-28', loginName: 'zhangsan' }
    expect(
      applyQuickFilter(
        'failed',
        { keyword: 'x', startTime: '2026-10-01' },
        context,
      ),
    ).toEqual({ keyword: 'x', resultStatus: '失败' })
    expect(applyQuickFilter('today', {}, context)).toEqual({
      startTime: '2026-10-28',
      endTime: '2026-10-28',
    })
    expect(applyQuickFilter('mine', { operatorName: '别人' }, context)).toEqual(
      {
        operatorName: 'zhangsan',
      },
    )
    expect(
      applyQuickFilter(
        'all',
        { keyword: 'x', resultStatus: '失败', operatorName: 'a' },
        context,
      ),
    ).toEqual({ keyword: 'x' })
  })
})

describe('CSV 与趋势补零', () => {
  it('CSV 带 BOM、表头与转义（引号/逗号不会破坏列）', () => {
    const csv = buildCsv([
      record({ businessNo: 'SO-001', errorMessage: '值 "异常", 含逗号' }),
    ])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"时间","操作人"')
    expect(csv).toContain('"值 ""异常"", 含逗号"')
    expect(csv.split('\r\n')).toHaveLength(2)
  })

  it('趋势按天补零，缺的日期是 0', () => {
    const trend = fillTrend(
      {
        total: 3,
        successCount: 2,
        failedCount: 1,
        avgDurationMs: 100,
        byDay: [{ date: '2026-10-28', total: 3, failed: 1 }],
        topFailedModules: [],
      },
      3,
      '2026-10-28',
    )
    expect(trend).toEqual([
      { date: '2026-10-26', total: 0, failed: 0 },
      { date: '2026-10-27', total: 0, failed: 0 },
      { date: '2026-10-28', total: 3, failed: 1 },
    ])
  })
})
