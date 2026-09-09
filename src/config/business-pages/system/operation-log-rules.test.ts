import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import { buildOperationLogOverview } from './operation-log-rules'

describe('operation-log-rules', () => {
  it('空行集合返回零计数', () => {
    const overview = buildOperationLogOverview([])
    expect(overview).toHaveLength(3)
    expect(overview.every((item) => item.value === '0')).toBe(true)
  })

  it('统计总数、成功数与失败数', () => {
    const rows = [
      { resultStatus: '成功' },
      { resultStatus: '成功' },
      { resultStatus: '失败' },
      {},
    ] as unknown as ModuleRecord[]
    const overview = buildOperationLogOverview(rows)
    expect(overview[0].value).toBe('4')
    expect(overview[1].value).toBe('2')
    expect(overview[2].value).toBe('1')
  })
})
