import type { CashLedgerQuery } from '@/api/finance/cash-ledger'
import type { FinanceBalance } from '@/api/finance/finance-overview'

export function buildCounterpartyLedgerQuery(
  balance: FinanceBalance,
): CashLedgerQuery {
  return {
    settlementCompanyId: balance.settlementCompanyId,
    counterpartyType: balance.counterpartyType,
    counterpartyId: balance.counterpartyId,
    page: 0,
    size: 100,
  }
}

export const COUNTERPARTY_LEDGER_EMPTY_DESCRIPTION = '暂无已审核资金流水'
