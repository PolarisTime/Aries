import { describe, expect, it } from 'vitest'
import { systemPageDefinitions } from '@/config/page-registry-system'

describe('systemPageDefinitions', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(systemPageDefinitions)).toBe(true)
    expect(systemPageDefinitions.length).toBeGreaterThan(0)
  })

  it('each definition has required fields', () => {
    for (const def of systemPageDefinitions) {
      expect(def.key).toBeDefined()
      expect(def.title).toBeDefined()
      expect(def.menuKey).toBeDefined()
      expect(def.view).toBeDefined()
      expect(def.icon).toBeDefined()
    }
  })

  it('defines print-template page', () => {
    const page = systemPageDefinitions.find((d) => d.key === 'print-template')
    expect(page).toBeDefined()
    expect(page!.title).toBe('打印模板')
    expect(page!.menuParent).toBe('system')
    expect(page!.resourceKey).toBe('print-template')
    expect(page!.icon).toBe('PrinterOutlined')
  })

  it('defines number-rules page', () => {
    const page = systemPageDefinitions.find((d) => d.key === 'number-rules')
    expect(page).toBeDefined()
    expect(page!.title).toBe('编号规则')
    expect(page!.menuParent).toBe('system')
    expect(page!.accessResources).toEqual(['general-setting'])
  })

  it('defines general-setting page', () => {
    const page = systemPageDefinitions.find((d) => d.key === 'general-setting')
    expect(page).toBeDefined()
    expect(page!.title).toBe('通用设置')
    expect(page!.menuParent).toBe('system')
    expect(page!.moduleKey).toBe('general-setting')
    expect(page!.resourceKey).toBe('general-setting')
  })

  it('defines company-setting page', () => {
    const page = systemPageDefinitions.find((d) => d.key === 'company-setting')
    expect(page).toBeDefined()
    expect(page!.title).toBe('公司信息')
    expect(page!.menuParent).toBe('system')
    expect(page!.moduleKey).toBe('company-setting')
    expect(page!.resourceKey).toBe('company-setting')
  })

  it('defines operation-log page', () => {
    const page = systemPageDefinitions.find((d) => d.key === 'operation-log')
    expect(page).toBeDefined()
    expect(page!.title).toBe('操作日志')
    expect(page!.menuParent).toBe('system')
    expect(page!.moduleKey).toBe('operation-log')
    expect(page!.resourceKey).toBe('operation-log')
  })

  it('defines access-control page', () => {
    const page = systemPageDefinitions.find((d) => d.key === 'access-control')
    expect(page).toBeDefined()
    expect(page!.title).toBe('访问控制')
    expect(page!.menuParent).toBe('system')
    expect(page!.accessResources).toEqual(['access-control'])
  })

  it('defines session page', () => {
    const page = systemPageDefinitions.find((d) => d.key === 'session')
    expect(page).toBeDefined()
    expect(page!.title).toBe('会话管理')
    expect(page!.menuParent).toBe('system')
    expect(page!.resourceKey).toBe('session')
  })

  it('defines api-key page', () => {
    const page = systemPageDefinitions.find((d) => d.key === 'api-key')
    expect(page).toBeDefined()
    expect(page!.title).toBe('API Key 管理')
    expect(page!.menuParent).toBe('system')
    expect(page!.resourceKey).toBe('api-key')
  })

  it('defines security-key page', () => {
    const page = systemPageDefinitions.find((d) => d.key === 'security-key')
    expect(page).toBeDefined()
    expect(page!.title).toBe('安全密钥管理')
    expect(page!.menuParent).toBe('system')
    expect(page!.resourceKey).toBe('security-key')
  })

  it('uses the database resource for the database management page', () => {
    const databasePage = systemPageDefinitions.find(
      (page) => page.key === 'database-backup',
    )

    expect(databasePage).toEqual(
      expect.objectContaining({
        resourceKey: 'database',
      }),
    )
    expect(databasePage?.accessResources).toBeUndefined()
  })

  it('all pages have menuParent set to system', () => {
    for (const page of systemPageDefinitions) {
      expect(page.menuParent).toBe('system')
    }
  })
})
