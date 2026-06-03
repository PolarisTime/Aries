import { describe, expect, it, vi } from 'vitest'

import { buildApiKeyListColumns } from '@/views/system/api-key-list-columns'

describe('api-key-list-columns', () => {
  const defaultOptions = {
    canEdit: true,
    actionOptions: [
      { code: 'read', title: '读取' },
      { code: 'write', title: '写入' },
    ],
    resourceOptions: [{ code: 'order', title: '订单管理', group: '业务' }],
    onView: vi.fn(),
    onRevoke: vi.fn(),
  }

  it('exports buildApiKeyListColumns as a function', () => {
    expect(typeof buildApiKeyListColumns).toBe('function')
  })

  it('returns an array of column definitions', () => {
    const columns = buildApiKeyListColumns(defaultOptions)
    expect(Array.isArray(columns)).toBe(true)
    expect(columns.length).toBeGreaterThan(0)
  })

  it('includes expected column data indexes', () => {
    const columns = buildApiKeyListColumns(defaultOptions)
    const dataIndexes = columns
      .map((col) => ('dataIndex' in col ? col.dataIndex : undefined))
      .filter(Boolean)
    expect(dataIndexes).toContain('keyName')
    expect(dataIndexes).toContain('usageScope')
    expect(dataIndexes).toContain('allowedResources')
    expect(dataIndexes).toContain('allowedActions')
    expect(dataIndexes).toContain('userName')
    expect(dataIndexes).toContain('keyPrefix')
    expect(dataIndexes).toContain('createdAt')
    expect(dataIndexes).toContain('expiresAt')
    expect(dataIndexes).toContain('lastUsedAt')
    expect(dataIndexes).toContain('status')
  })

  it('includes action column with key "action"', () => {
    const columns = buildApiKeyListColumns(defaultOptions)
    const actionCol = columns.find(
      (col) => 'key' in col && col.key === 'action',
    )
    expect(actionCol).toBeDefined()
  })

  it('each column has a title', () => {
    const columns = buildApiKeyListColumns(defaultOptions)
    for (const col of columns) {
      expect(col).toHaveProperty('title')
    }
  })

  it('each column has a width', () => {
    const columns = buildApiKeyListColumns(defaultOptions)
    for (const col of columns) {
      expect(col).toHaveProperty('width')
    }
  })
})
