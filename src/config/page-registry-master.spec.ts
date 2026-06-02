import { describe, expect, it } from 'vitest'
import { masterPageDefinitions } from '@/config/page-registry-master'
import { systemPageDefinitions } from '@/config/page-registry-system'

describe('masterPageDefinitions', () => {
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
    expect(systemPageDefinitions.some((page) => page.key === 'department')).toBe(
      false,
    )
  })
})
