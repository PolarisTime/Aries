import { describe, expect, it } from 'vitest'
import { systemPageDefinitions } from '@/config/page-registry-system'

describe('systemPageDefinitions', () => {
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

  it('keeps number rules naming aligned with the menu label', () => {
    const numberRulesPage = systemPageDefinitions.find(
      (page) => page.key === 'number-rules',
    )

    expect(numberRulesPage?.title).toBe('编号规则')
  })
})
