import { describe, expect, it } from 'vitest'
import { loadBusinessPageConfig } from '@/config/business-page-loader'

describe('business-page-loader', () => {
  it('loads the access-control permission catalog config by module key', async () => {
    const config = await loadBusinessPageConfig('permission')

    expect(config.key).toBe('permission')
    expect(config.columns.map((column) => column.dataIndex)).toContain(
      'permissionCode',
    )
  })
})
