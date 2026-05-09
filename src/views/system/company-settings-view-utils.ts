import type { CompanySettlementAccount } from '@/api/company-settings'

export interface SettlementAccountFormRow extends CompanySettlementAccount {
  localKey: string
}

let accountRowSeed = 0

function nextLocalKey() {
  accountRowSeed += 1
  return `settlement-account-${accountRowSeed}`
}

export function createEmptySettlementAccount(): SettlementAccountFormRow {
  return {
    localKey: nextLocalKey(),
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
  if (!accounts?.length) return [createEmptySettlementAccount()]
  return accounts.map((account) => ({
    ...account,
    id: account.id == null || account.id === '' ? undefined : account.id,
    accountName: String(account.accountName || ''),
    bankName: String(account.bankName || ''),
    bankAccount: String(account.bankAccount || ''),
    usageType: String(account.usageType || '通用'),
    status: String(account.status || '正常'),
    remark: String(account.remark || ''),
    localKey: nextLocalKey(),
  }))
}
