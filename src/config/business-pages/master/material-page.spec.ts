import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  materialCategoryOptions: [],
  materialGradeOptions: [],
  getMaterialCategoryOptions: [],
}))

import { materialsPageConfig } from './material-page'

describe('materialsPageConfig', () => {
  it('has correct key', () => {
    expect(materialsPageConfig.key).toBe('material')
  })

  it('has primaryNoKey', () => {
    expect(materialsPageConfig.primaryNoKey).toBe('materialCode')
  })

  it('has filters', () => {
    expect(materialsPageConfig.filters).toBeDefined()
    expect(materialsPageConfig.filters!.length).toBeGreaterThanOrEqual(3)
  })

  it('has columns', () => {
    expect(materialsPageConfig.columns).toBeDefined()
    expect(materialsPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has detailFields', () => {
    expect(materialsPageConfig.detailFields).toBeDefined()
    expect(materialsPageConfig.detailFields!.length).toBeGreaterThan(0)
  })

  it('has formFields', () => {
    expect(materialsPageConfig.formFields).toBeDefined()
    expect(materialsPageConfig.formFields!.length).toBeGreaterThan(0)
  })

  it('has buildOverview', () => {
    expect(materialsPageConfig.buildOverview).toBeDefined()
    const result = materialsPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })

  it('has data initialized to empty array', () => {
    expect(materialsPageConfig.data).toEqual([])
  })
})
