import type { CompanySettingProfile } from '@/api/system/company-settings'
import { SETTLEMENT_TYPE, STATUS } from '@/constants/status-constants'
import { asString } from '@/utils/type-narrowing'
import {
  normalizeSettlementAccounts,
  type SettlementAccountFormRow,
} from '@/views/system/company-settings-view-utils'

export type CompanySettingFormValues = {
  id?: string
  companyName: string
  taxNo: string
  status: string
  remark?: string
  settlementAccounts: SettlementAccountFormRow[]
  [key: string]: unknown
}

export function buildCompanySettingFormValues(
  profile: CompanySettingProfile | null,
): CompanySettingFormValues {
  return {
    id: profile?.id,
    companyName: profile?.companyName ?? '',
    taxNo: profile?.taxNo ?? '',
    status: profile?.status || STATUS.NORMAL,
    remark: profile?.remark || '',
    settlementAccounts: normalizeSettlementAccounts(
      profile?.settlementAccounts,
    ),
  }
}

export function normalizeSubmittedSettlementAccounts(
  accounts: SettlementAccountFormRow[],
) {
  const normalizedAccounts = []
  for (const account of accounts) {
    const accountName = asString(account.accountName).trim()
    const bankName = asString(account.bankName).trim()
    const bankAccount = asString(account.bankAccount).trim()
    const remark = asString(account.remark).trim()
    if (!accountName && !bankName && !bankAccount && !remark) {
      continue
    }
    normalizedAccounts.push({
      id:
        account.id == null || account.id === ''
          ? undefined
          : String(account.id),
      accountName,
      bankName,
      bankAccount,
      usageType: asString(account.usageType).trim() || SETTLEMENT_TYPE.GENERAL,
      status: asString(account.status).trim() || STATUS.NORMAL,
      remark,
    })
  }
  return normalizedAccounts
}

export function buildPayload(values: CompanySettingFormValues) {
  const settlementAccounts = normalizeSubmittedSettlementAccounts(
    values.settlementAccounts || [],
  )
  return {
    companyName: values.companyName.trim(),
    taxNo: values.taxNo.trim(),
    settlementAccounts,
    status: values.status || STATUS.NORMAL,
    remark: values.remark?.trim() || '',
  }
}
