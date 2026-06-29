import type { CompanySettlementAccount } from '@/api/company-settings'

export type SettlementAccountFormRow = CompanySettlementAccount

export function createEmptySettlementAccount(): SettlementAccountFormRow {
  return {
    accountName: '',
    bankName: '',
    bankAccount: '',
    usageType: '通用',
    status: '正常',
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
    status: String(account.status || '正常'),
    remark: String(account.remark || ''),
  }))
}
