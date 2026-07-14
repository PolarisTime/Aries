import { describe, expect, it, vi } from 'vitest'
import { createPaginationConfig } from './usePaginationConfig'

describe('createPaginationConfig', () => {
  const t = vi.fn((key: string, options?: Record<string, unknown>) => {
    if (options) return `${key}:${JSON.stringify(options)}`
    return key
  })

  const baseParams = {
    current: 1,
    pageSize: 20,
    total: 100,
    onChange: vi.fn(),
    t,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns correct pagination config', () => {
    const config = createPaginationConfig(baseParams)
    expect(config.current).toBe(1)
    expect(config.pageSize).toBe(20)
    expect(config.total).toBe(100)
    expect(config.showSizeChanger).toBe(true)
  })

  it('uses default pageSizeOptions', () => {
    const config = createPaginationConfig(baseParams)
    expect(config.pageSizeOptions).toEqual(['10', '20', '50', '100'])
  })

  it('supports custom pageSizeOptions', () => {
    const config = createPaginationConfig({
      ...baseParams,
      pageSizeOptions: ['5', '15'],
    })
    expect(config.pageSizeOptions).toEqual(['5', '15'])
  })

  it('calls showTotal with translated text', () => {
    const config = createPaginationConfig(baseParams)
    const result = config.showTotal(50)
    expect(t).toHaveBeenCalledWith('hooks.pagination.total', { count: 50 })
    expect(result).toBe('hooks.pagination.total:{"count":50}')
  })

  it('passes onChange callback', () => {
    const onChange = vi.fn()
    const config = createPaginationConfig({ ...baseParams, onChange })
    config.onChange(2, 50)
    expect(onChange).toHaveBeenCalledWith(2, 50)
  })
})
