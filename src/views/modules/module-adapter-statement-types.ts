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

export interface SupplierStatementDraftOptions
  extends StatementDraftSharedOptions {
  sourceInbounds: ModuleRecord[]
  payments: ModuleRecord[]
  defaultFullPayment: boolean
}

export interface CustomerStatementDraftOptions
  extends StatementDraftSharedOptions {
  sourceOrders: ModuleRecord[]
  defaultReceiptAmountZero: boolean
}

export interface FreightStatementDraftOptions
  extends StatementDraftSharedOptions {
  sourceBills: ModuleRecord[]
}
