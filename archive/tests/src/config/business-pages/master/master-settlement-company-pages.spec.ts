import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import { masterSettlementCompanyPageConfigs } from './master-settlement-company-pages'

describe('masterSettlementCompanyPageConfigs', () => {
  it('contains settlement company config', () => {
    const config = masterSettlementCompanyPageConfigs['company-setting']

    expect(config).toBeDefined()
    expect(config.key).toBe('company-setting')
    expect(config.kicker).toBe('Master Data')
  })

  it('has columns and form fields', () => {
    const config = masterSettlementCompanyPageConfigs['company-setting']

    expect(config.columns.length).toBeGreaterThan(0)
    expect(config.formFields).toBeDefined()
  })

  it('builds overview from settlement company rows', () => {
    const config = masterSettlementCompanyPageConfigs['company-setting']

    expect(config.buildOverview?.([{ id: '1' }, { id: '2' }])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: expect.any(String) }),
      ]),
    )
  })
})
