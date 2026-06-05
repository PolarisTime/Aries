import { describe, expect, it } from 'vitest'
import { masterPageDefinitions } from '@/config/page-registry-master'
import { systemPageDefinitions } from '@/config/page-registry-system'

describe('masterPageDefinitions', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(masterPageDefinitions)).toBe(true)
    expect(masterPageDefinitions.length).toBeGreaterThan(0)
  })

  it('each definition has required fields', () => {
    for (const def of masterPageDefinitions) {
      expect(def.key).toBeDefined()
      expect(def.title).toBeDefined()
      expect(def.menuKey).toBeDefined()
      expect(def.view).toBeDefined()
      expect(def.icon).toBeDefined()
    }
  })

  it('defines material page', () => {
    const page = masterPageDefinitions.find((d) => d.key === 'material')
    expect(page).toBeDefined()
    expect(page!.title).toBe('商品资料')
    expect(page!.menuParent).toBe('master')
    expect(page!.moduleKey).toBe('material')
    expect(page!.icon).toBe('DatabaseOutlined')
  })

  it('defines material-categories page', () => {
    const page = masterPageDefinitions.find(
      (d) => d.key === 'material-categories',
    )
    expect(page).toBeDefined()
    expect(page!.title).toBe('商品类别')
    expect(page!.menuParent).toBe('master')
    expect(page!.moduleKey).toBe('material-categories')
    expect(page!.resourceKey).toBe('material')
    expect(page!.icon).toBe('TagsOutlined')
  })

  it('defines supplier page', () => {
    const page = masterPageDefinitions.find((d) => d.key === 'supplier')
    expect(page).toBeDefined()
    expect(page!.title).toBe('供应商资料')
    expect(page!.menuParent).toBe('master')
    expect(page!.moduleKey).toBe('supplier')
    expect(page!.icon).toBe('TeamOutlined')
  })

  it('defines customer page', () => {
    const page = masterPageDefinitions.find((d) => d.key === 'customer')
    expect(page).toBeDefined()
    expect(page!.title).toBe('客户资料')
    expect(page!.menuParent).toBe('master')
    expect(page!.moduleKey).toBe('customer')
    expect(page!.icon).toBe('UserOutlined')
  })

  it('defines carrier page', () => {
    const page = masterPageDefinitions.find((d) => d.key === 'carrier')
    expect(page).toBeDefined()
    expect(page!.title).toBe('物流方资料')
    expect(page!.menuParent).toBe('master')
    expect(page!.moduleKey).toBe('carrier')
    expect(page!.icon).toBe('CarOutlined')
  })

  it('defines warehouse page', () => {
    const page = masterPageDefinitions.find((d) => d.key === 'warehouse')
    expect(page).toBeDefined()
    expect(page!.title).toBe('仓库资料')
    expect(page!.menuParent).toBe('master')
    expect(page!.moduleKey).toBe('warehouse')
    expect(page!.icon).toBe('BankOutlined')
  })

  it('places department management under master data', () => {
    const departmentPage = masterPageDefinitions.find(
      (page) => page.key === 'department',
    )

    expect(departmentPage).toEqual(
      expect.objectContaining({
        menuParent: 'master',
        menuKey: '/department',
        resourceKey: 'department',
      }),
    )
    expect(
      systemPageDefinitions.some((page) => page.key === 'department'),
    ).toBe(false)
  })

  it('all pages have menuParent set to master', () => {
    for (const page of masterPageDefinitions) {
      expect(page.menuParent).toBe('master')
    }
  })
})
