import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { getApiMessage } from '@/utils/api-messages'
import { asNumber, asString } from '@/utils/type-narrowing'

export interface CompanySettlementAccount {
  id?: string | number
  accountName: string
  bankName: string
  bankAccount: string
  usageType: string
  status: string
  remark?: string
}

export interface CompanySettingProfile {
  id: string
  companyName: string
  taxNo: string
  bankName?: string
  bankAccount?: string
  taxRate?: number
  settlementAccounts: CompanySettlementAccount[]
  status: string
  remark?: string
}

interface CompanyResponse<T> {
  code: number
  message?: string
  data: T
}

export type RawSettlementAccount = {
  id?: string | number
  accountName?: string
  bankName?: string
  bankAccount?: string
  usageType?: string
  status?: string
  remark?: string
}

export type RawCompanyProfile = {
  id?: string | number
  companyName?: string
  taxNo?: string
  bankName?: string
  bankAccount?: string
  taxRate?: number
  settlementAccounts?: RawSettlementAccount[]
  status?: string
  remark?: string
}

export function normalizeProfile(
  raw: RawCompanyProfile | null | undefined,
): CompanySettingProfile | null {
  if (!raw) return null
  return {
    id: asString(raw.id),
    companyName: asString(raw.companyName),
    taxNo: asString(raw.taxNo),
    bankName: raw.bankName ? asString(raw.bankName) : undefined,
    bankAccount: raw.bankAccount ? asString(raw.bankAccount) : undefined,
    taxRate: raw.taxRate ? asNumber(raw.taxRate) : undefined,
    settlementAccounts: Array.isArray(raw.settlementAccounts)
      ? raw.settlementAccounts.map((item) => ({
          id: item.id == null ? '' : asString(item.id),
          accountName: asString(item.accountName),
          bankName: asString(item.bankName),
          bankAccount: asString(item.bankAccount),
          usageType: asString(item.usageType) || '通用',
          status: asString(item.status) || '正常',
          remark: asString(item.remark),
        }))
      : [],
    status: asString(raw.status) || '正常',
    remark: asString(raw.remark),
  }
}

export async function getCompanySettingProfile() {
  const r = assertApiSuccess(
    await http.get<CompanyResponse<RawCompanyProfile | null>>(
      ENDPOINTS.COMPANY_SETTINGS_CURRENT,
    ),
    getApiMessage('loadCompanyInfoFailed'),
  )
  return normalizeProfile(r.data)
}

export async function saveCompanySettingProfile(
  payload: Omit<CompanySettingProfile, 'id'>,
) {
  const r = assertApiSuccess(
    await http.put<CompanyResponse<RawCompanyProfile>>(
      ENDPOINTS.COMPANY_SETTINGS_CURRENT,
      payload,
    ),
    getApiMessage('saveCompanyInfoFailed'),
  )
  return normalizeProfile(r.data)
}
