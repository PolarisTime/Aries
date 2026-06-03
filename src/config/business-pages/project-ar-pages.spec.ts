import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import { projectArPageConfigs } from './project-ar-pages'

describe('projectArPageConfigs', () => {
  it('contains project-ar config', () => {
    expect(projectArPageConfigs['project-ar']).toBeDefined()
    expect(projectArPageConfigs['project-ar'].key).toBe('project-ar')
  })

  it('is readOnly', () => {
    expect(projectArPageConfigs['project-ar'].readOnly).toBe(true)
  })

  it('has filters', () => {
    expect(projectArPageConfigs['project-ar'].filters).toBeDefined()
  })

  it('has columns', () => {
    expect(projectArPageConfigs['project-ar'].columns).toBeDefined()
    expect(projectArPageConfigs['project-ar'].columns.length).toBeGreaterThan(0)
  })

  it('buildOverview returns result', () => {
    const result = projectArPageConfigs['project-ar'].buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)
  })
})
