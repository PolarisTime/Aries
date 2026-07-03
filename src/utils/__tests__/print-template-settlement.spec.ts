import { describe, expect, it } from 'vitest'
import type { PrintTemplateRecord } from '@/shared/schemas'
import type { ModuleRecord } from '@/types/module-page'
import {
  filterPrintTemplatesBySettlementCompany,
  matchesPrintTemplateSettlementCompany,
} from '../print-template-settlement'

function template(
  overrides: Partial<PrintTemplateRecord> = {},
): PrintTemplateRecord {
  return {
    id: 'template-1',
    templateName: 'Template',
    templateCode: 'template',
    templateHtml: '<div />',
    settlementCompanyId: null,
    settlementCompanyName: null,
    ...overrides,
  }
}

function record(overrides: Partial<ModuleRecord> = {}): ModuleRecord {
  return {
    id: 'record-1',
    settlementCompanyId: 'company-1',
    settlementCompanyName: 'Acme',
    ...overrides,
  }
}

describe('print-template-settlement', () => {
  describe('matchesPrintTemplateSettlementCompany', () => {
    it('matches by settlement company id when both sides provide ids', () => {
      expect(
        matchesPrintTemplateSettlementCompany(
          template({ settlementCompanyId: 1 }),
          record({ settlementCompanyId: '1', settlementCompanyName: 'Other' }),
        ),
      ).toBe(true)
    })

    it('rejects different settlement company ids', () => {
      expect(
        matchesPrintTemplateSettlementCompany(
          template({ settlementCompanyId: 'company-2' }),
          record(),
        ),
      ).toBe(false)
    })

    it('falls back to company name when template id exists but record id is empty', () => {
      expect(
        matchesPrintTemplateSettlementCompany(
          template({
            settlementCompanyId: 'company-1',
            settlementCompanyName: ' Acme ',
          }),
          record({ settlementCompanyId: '', settlementCompanyName: 'Acme' }),
        ),
      ).toBe(true)
    })

    it('rejects template id fallback when template name is empty', () => {
      expect(
        matchesPrintTemplateSettlementCompany(
          template({
            settlementCompanyId: 'company-1',
            settlementCompanyName: '',
          }),
          record({ settlementCompanyId: '', settlementCompanyName: 'Acme' }),
        ),
      ).toBe(false)
    })

    it('matches by company name when template id is empty', () => {
      expect(
        matchesPrintTemplateSettlementCompany(
          template({ settlementCompanyName: 'Acme' }),
          record({ settlementCompanyId: '', settlementCompanyName: ' Acme ' }),
        ),
      ).toBe(true)
    })

    it('rejects different company names when template id is empty', () => {
      expect(
        matchesPrintTemplateSettlementCompany(
          template({ settlementCompanyName: 'Acme' }),
          record({ settlementCompanyId: '', settlementCompanyName: 'Beta' }),
        ),
      ).toBe(false)
    })

    it('matches global templates only when the record has no settlement company', () => {
      expect(
        matchesPrintTemplateSettlementCompany(
          template(),
          record({ settlementCompanyId: '', settlementCompanyName: '' }),
        ),
      ).toBe(true)

      expect(matchesPrintTemplateSettlementCompany(template(), record())).toBe(
        false,
      )
    })

    it('treats missing record as having no settlement company', () => {
      expect(matchesPrintTemplateSettlementCompany(template())).toBe(true)
      expect(
        matchesPrintTemplateSettlementCompany(
          template({ settlementCompanyName: 'Acme' }),
        ),
      ).toBe(false)
    })
  })

  it('filters templates by settlement company', () => {
    const templates = [
      template({ id: 'global' }),
      template({ id: 'match', settlementCompanyId: 'company-1' }),
      template({ id: 'miss', settlementCompanyId: 'company-2' }),
    ]

    expect(
      filterPrintTemplatesBySettlementCompany(templates, record()),
    ).toEqual([templates[1]])
  })
})
