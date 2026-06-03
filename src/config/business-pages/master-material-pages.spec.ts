import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getMaterialCategoryOptions: [],
  materialCategoryOptions: [],
  materialGradeOptions: [],
  enabledStatusOptions: [],
}))

import { masterMaterialPageConfigs } from './master-material-pages'

describe('masterMaterialPageConfigs', () => {
  it('contains material config', () => {
    expect(masterMaterialPageConfigs.material).toBeDefined()
    expect(masterMaterialPageConfigs.material.key).toBe('material')
  })

  it('contains material-categories config', () => {
    expect(masterMaterialPageConfigs['material-categories']).toBeDefined()
    expect(masterMaterialPageConfigs['material-categories'].key).toBe('material-categories')
  })

  it('has exactly 2 entries', () => {
    expect(Object.keys(masterMaterialPageConfigs)).toHaveLength(2)
  })
})
