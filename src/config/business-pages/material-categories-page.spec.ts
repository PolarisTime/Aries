import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [],
}))

import { materialCategoriesPageConfig } from './material-categories-page'

describe('materialCategoriesPageConfig', () => {
  it('has correct key', () => {
    expect(materialCategoriesPageConfig.key).toBe('material-categories')
  })

  it('has primaryNoKey', () => {
    expect(materialCategoriesPageConfig.primaryNoKey).toBe('categoryCode')
  })

  it('has filters', () => {
    expect(materialCategoriesPageConfig.filters).toBeDefined()
    expect(materialCategoriesPageConfig.filters!.length).toBeGreaterThanOrEqual(2)
  })

  it('has columns', () => {
    expect(materialCategoriesPageConfig.columns).toBeDefined()
    expect(materialCategoriesPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has formFields', () => {
    expect(materialCategoriesPageConfig.formFields).toBeDefined()
    expect(materialCategoriesPageConfig.formFields!.length).toBeGreaterThan(0)
  })

  it('buildOverview returns result for empty rows', () => {
    const result = materialCategoriesPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })
})
