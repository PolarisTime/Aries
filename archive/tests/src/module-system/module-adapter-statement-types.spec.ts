import { describe, expect, it } from 'vitest'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import type {
  CustomerStatementDraftOptions,
  FreightStatementDraftOptions,
  StatementPeriod,
  SupplierStatementDraftOptions,
} from './module-adapter-statement-types'

describe('module-adapter-statement-types', () => {
  describe('StatementPeriod', () => {
    it('accepts valid period with start and end dates', () => {
      const period: StatementPeriod = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      }
      expect(period.startDate).toBe('2024-01-01')
      expect(period.endDate).toBe('2024-01-31')
    })
  })

  describe('SupplierStatementDraftOptions', () => {
    it('accepts valid supplier statement options', () => {
      const options: SupplierStatementDraftOptions = {
        baseDraft: { id: '1' } as ModuleRecord,
        today: '2024-01-15',
        statementPeriod: { startDate: '2024-01-01', endDate: '2024-01-31' },
        cloneLineItems: (_v: unknown) => [] as ModuleLineItem[],
        buildLineItemId: () => 'item-1',
        sourceInbounds: [] as ModuleRecord[],
        payments: [] as ModuleRecord[],
        defaultFullPayment: false,
      }

      expect(options.today).toBe('2024-01-15')
      expect(options.defaultFullPayment).toBe(false)
      expect(options.cloneLineItems).toBeInstanceOf(Function)
      expect(options.buildLineItemId).toBeInstanceOf(Function)
    })
  })

  describe('CustomerStatementDraftOptions', () => {
    it('accepts valid customer statement options', () => {
      const options: CustomerStatementDraftOptions = {
        baseDraft: { id: '1' } as ModuleRecord,
        today: '2024-01-15',
        cloneLineItems: (_v: unknown) => [] as ModuleLineItem[],
        buildLineItemId: () => 'item-1',
        sourceOrders: [] as ModuleRecord[],
        defaultReceiptAmountZero: true,
      }

      expect(options.defaultReceiptAmountZero).toBe(true)
      expect(options.sourceOrders).toEqual([])
    })
  })

  describe('FreightStatementDraftOptions', () => {
    it('accepts valid freight statement options', () => {
      const options: FreightStatementDraftOptions = {
        baseDraft: { id: '1' } as ModuleRecord,
        today: '2024-01-15',
        cloneLineItems: (_v: unknown) => [] as ModuleLineItem[],
        buildLineItemId: () => 'item-1',
        sourceBills: [] as ModuleRecord[],
      }

      expect(options.sourceBills).toEqual([])
    })
  })
})
