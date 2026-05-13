import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

export interface StatementPeriod {
  startDate: string
  endDate: string
}

interface StatementDraftSharedOptions {
  baseDraft: ModuleRecord
  today: string
  statementPeriod?: StatementPeriod
  cloneLineItems: (value: unknown) => ModuleLineItem[]
  buildLineItemId: () => string
}

export type SupplierStatementDraftOptions = StatementDraftSharedOptions & {
  sourceInbounds: ModuleRecord[]
  payments: ModuleRecord[]
  defaultFullPayment: boolean
}

export type CustomerStatementDraftOptions = StatementDraftSharedOptions & {
  sourceOrders: ModuleRecord[]
  defaultReceiptAmountZero: boolean
}

export type FreightStatementDraftOptions = StatementDraftSharedOptions & {
  sourceBills: ModuleRecord[]
}
