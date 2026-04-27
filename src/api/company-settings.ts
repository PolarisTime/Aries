import { assertApiSuccess, http } from '@/api/client'

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

function normalizeProfile(record: Record<string, unknown> | null | undefined): CompanySettingProfile | null {
  if (!record) {
    return null
  }

  return {
    id: String(record.id || ''),
    companyName: String(record.companyName || ''),
    taxNo: String(record.taxNo || ''),
    bankName: String(record.bankName || ''),
    bankAccount: String(record.bankAccount || ''),
    taxRate: Number(record.taxRate || 0),
    settlementAccounts: Array.isArray(record.settlementAccounts)
      ? record.settlementAccounts.map((item) => {
        const row = item as Record<string, unknown>
        return {
          id: row.id == null ? '' : String(row.id),
          accountName: String(row.accountName || ''),
          bankName: String(row.bankName || ''),
          bankAccount: String(row.bankAccount || ''),
          usageType: String(row.usageType || '通用'),
          status: String(row.status || '正常'),
          remark: String(row.remark || ''),
        }
      })
      : [],
    status: String(record.status || '正常'),
    remark: String(record.remark || ''),
  }
}

export async function getCompanySettingProfile() {
  const response = assertApiSuccess(
    await http.get('/company-settings/current') as unknown as CompanyResponse<Record<string, unknown> | null>,
    '加载公司信息失败',
  )
  return normalizeProfile(response.data)
}

export async function saveCompanySettingProfile(payload: Omit<CompanySettingProfile, 'id'>) {
  const response = assertApiSuccess(
    await http.put('/company-settings/current', payload) as unknown as CompanyResponse<Record<string, unknown>>,
    '保存公司信息失败',
  )
  return normalizeProfile(response.data)
}
