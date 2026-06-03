import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import { systemAuditPageConfigs } from './system-audit-pages'

describe('systemAuditPageConfigs', () => {
  it('contains operation-log config', () => {
    expect(systemAuditPageConfigs['operation-log']).toBeDefined()
    expect(systemAuditPageConfigs['operation-log'].key).toBe('operation-log')
  })

  it('has exactly 1 entry', () => {
    expect(Object.keys(systemAuditPageConfigs)).toHaveLength(1)
  })
})
