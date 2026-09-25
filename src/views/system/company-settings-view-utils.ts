import type { CompanySettlementAccount } from '@/api/system/company-settings'
import { STATUS } from '@/constants/status-constants'

export type SettlementAccountFormRow = CompanySettlementAccount

export function createEmptySettlementAccount(): SettlementAccountFormRow {
  return {
    accountName: '',
    bankName: '',
    bankAccount: '',
    usageType: '通用',
    status: STATUS.NORMAL,
    remark: '',
  }
}

export function normalizeSettlementAccounts(
  accounts: CompanySettlementAccount[] | undefined | null,
): SettlementAccountFormRow[] {
  if (!accounts?.length) return []
  return accounts.map((account) => ({
    ...account,
    id: account.id == null || account.id === '' ? undefined : account.id,
    accountName: String(account.accountName || ''),
    bankName: String(account.bankName || ''),
    bankAccount: String(account.bankAccount || ''),
    usageType: String(account.usageType || '通用'),
    status: String(account.status || STATUS.NORMAL),
    remark: String(account.remark || ''),
  }))
}
