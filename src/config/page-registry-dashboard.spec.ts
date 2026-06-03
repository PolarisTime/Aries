import { describe, expect, it } from 'vitest'
import { dashboardPageDefinitions } from './page-registry-dashboard'

describe('page-registry-dashboard', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(dashboardPageDefinitions)).toBe(true)
    expect(dashboardPageDefinitions.length).toBeGreaterThan(0)
  })

  it('defines dashboard page', () => {
    const dashboard = dashboardPageDefinitions.find((d) => d.key === 'dashboard')
    expect(dashboard).toBeDefined()
    expect(dashboard!.title).toBe('工作台')
    expect(dashboard!.view).toBe('dashboard')
    expect(dashboard!.icon).toBe('HomeOutlined')
    expect(dashboard!.menuKey).toBe('/dashboard')
  })

  it('each definition has required fields', () => {
    for (const def of dashboardPageDefinitions) {
      expect(def.key).toBeDefined()
      expect(def.title).toBeDefined()
      expect(def.menuKey).toBeDefined()
      expect(def.view).toBeDefined()
      expect(def.icon).toBeDefined()
    }
  })
})
