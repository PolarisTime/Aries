import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import { systemAccessPageConfigs } from './system-access-pages'

describe('systemAccessPageConfigs', () => {
  it('contains permission config', () => {
    expect(systemAccessPageConfigs.permission).toBeDefined()
    expect(systemAccessPageConfigs.permission.key).toBe('permission')
  })

  it('has exactly 1 entry', () => {
    expect(Object.keys(systemAccessPageConfigs)).toHaveLength(1)
  })
})
