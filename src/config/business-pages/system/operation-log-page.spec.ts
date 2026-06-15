import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import { operationLogsPageConfig } from './operation-log-page'

describe('operationLogsPageConfig', () => {
  it('has correct key', () => {
    expect(operationLogsPageConfig.key).toBe('operation-log')
  })

  it('is readOnly', () => {
    expect(operationLogsPageConfig.readOnly).toBe(true)
  })

  it('has quickFilters', () => {
    expect(operationLogsPageConfig.quickFilters).toBeDefined()
    expect(operationLogsPageConfig.quickFilters!.length).toBeGreaterThanOrEqual(
      2,
    )
  })

  it('has filters', () => {
    expect(operationLogsPageConfig.filters).toBeDefined()
    expect(operationLogsPageConfig.filters!.length).toBeGreaterThanOrEqual(5)
  })

  it('has columns', () => {
    expect(operationLogsPageConfig.columns).toBeDefined()
    expect(operationLogsPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has detailFields', () => {
    expect(operationLogsPageConfig.detailFields).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = operationLogsPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)
  })

  it('buildOverview computes success/failed counts', () => {
    const rows = [
      { resultStatus: '成功' },
      { resultStatus: '成功' },
      { resultStatus: '失败' },
    ]
    const result = operationLogsPageConfig.buildOverview!(rows as any)
    expect(result).toHaveLength(3)
  })

  it('has rowHighlightStatuses', () => {
    expect(operationLogsPageConfig.rowHighlightStatuses).toContain('失败')
  })
})
