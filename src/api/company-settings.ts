import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { asString, asNumber } from '@/utils/type-narrowing'

export interface CompanySettlementAccount {
  id?: string | number
  accountName: string; bankName: string; bankAccount: string
  usageType: string; status: string; remark?: string
}

export interface CompanySettingProfile {
  id: string; companyName: string; taxNo: string
  bankName?: string; bankAccount?: string; taxRate?: number
  settlementAccounts: CompanySettlementAccount[]
  status: string; remark?: string
}

interface CompanyResponse<T> { code: number; message?: string; data: T }

function normalizeProfile(raw: Record<string, unknown> | null | undefined): CompanySettingProfile | null {
  if (!raw) return null
  return {
    id: asString(raw.id),
    companyName: asString(raw.companyName),
    taxNo: asString(raw.taxNo),
    bankName: raw.bankName ? asString(raw.bankName) : undefined,
    bankAccount: raw.bankAccount ? asString(raw.bankAccount) : undefined,
    taxRate: raw.taxRate ? asNumber(raw.taxRate) : undefined,
    settlementAccounts: (Array.isArray(raw.settlementAccounts)
      ? raw.settlementAccounts.map((item) => {
          const row = item as Record<string, unknown>
          return {
            id: row.id == null ? '' : asString(row.id),
            accountName: asString(row.accountName),
            bankName: asString(row.bankName),
            bankAccount: asString(row.bankAccount),
            usageType: asString(row.usageType) || '通用',
            status: asString(row.status) || '正常',
            remark: asString(row.remark),
          }
        })
      : []),
    status: asString(raw.status) || '正常',
    remark: asString(raw.remark),
  }
}

export async function getCompanySettingProfile() {
  const r = assertApiSuccess(
    await http.get<CompanyResponse<Record<string, unknown> | null>>(ENDPOINTS.COMPANY_SETTINGS_CURRENT),
    '加载公司信息失败',
  )
  return normalizeProfile(r.data)
}

export async function saveCompanySettingProfile(payload: Omit<CompanySettingProfile, 'id'>) {
  const r = assertApiSuccess(
    await http.put<CompanyResponse<Record<string, unknown>>>(ENDPOINTS.COMPANY_SETTINGS_CURRENT, payload),
    '保存公司信息失败',
  )
  return normalizeProfile(r.data)
}
