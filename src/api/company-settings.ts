import { assertApiSuccess, http } from '@/api/client'
import { pageContent } from '@/api/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/lib/query-cached-options'
import { getApiMessage } from '@/utils/api-messages'
import { asId, asString } from '@/utils/type-narrowing'

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
  settlementAccounts: CompanySettlementAccount[]
  status: string
  remark?: string
}

export interface SettlementCompanyOption {
  id: string
  value: string
  label: string
  companyName: string
  taxNo?: string
  status?: string
}

interface CompanyResponse<T> {
  code: number
  message?: string
  data: T
}

interface CompanyPageData {
  content?: RawCompanyProfile[]
  records?: RawCompanyProfile[]
  totalElements?: number
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
  settlementAccounts?: RawSettlementAccount[]
  status?: string
  remark?: string
}

export type RawSettlementCompanyOption = {
  id?: string | number
  companyName?: string
  taxNo?: string
  status?: string
}

export function normalizeSettlementCompanyOptions(
  rows: RawSettlementCompanyOption[],
): SettlementCompanyOption[] {
  return rows.flatMap((row) => {
    const id = asId(row.id)
    const companyName = asString(row.companyName).trim()
    if (!id || !companyName) {
      return []
    }
    return [
      {
        id,
        value: id,
        label: companyName,
        companyName,
        taxNo: asString(row.taxNo).trim() || undefined,
        status: asString(row.status).trim() || undefined,
      },
    ]
  })
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

export async function listCompanySettings() {
  const r = assertApiSuccess(
    await http.get<CompanyResponse<CompanyPageData>>(
      ENDPOINTS.COMPANY_SETTINGS,
      {
        params: { page: 0, size: 200, sortBy: 'id', direction: 'asc' },
      },
    ),
    getApiMessage('loadCompanyInfoFailed'),
  )
  return pageContent(r.data).flatMap((item) => {
    const profile = normalizeProfile(item)
    return profile ? [profile] : []
  })
}

const settlementCompanyOptions = createQueryCachedOptions<
  SettlementCompanyOption,
  RawSettlementCompanyOption
>({
  endpoint: ENDPOINTS.COMPANY_SETTINGS_OPTIONS,
  queryKey: QUERY_KEYS.masterOptions.settlementCompany,
  normalizer: normalizeSettlementCompanyOptions,
})

export const fetchSettlementCompanyOptions = settlementCompanyOptions.fetch
export const reloadSettlementCompanyOptions = settlementCompanyOptions.reload

export function getSettlementCompanyOptions(): SettlementCompanyOption[] {
  return settlementCompanyOptions.get()
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

export async function createCompanySetting(
  payload: Omit<CompanySettingProfile, 'id'>,
) {
  const r = assertApiSuccess(
    await http.post<CompanyResponse<RawCompanyProfile>>(
      ENDPOINTS.COMPANY_SETTINGS,
      payload,
    ),
    getApiMessage('saveCompanyInfoFailed'),
  )
  return normalizeProfile(r.data)
}

export async function updateCompanySetting(
  id: string,
  payload: Omit<CompanySettingProfile, 'id'>,
) {
  const r = assertApiSuccess(
    await http.put<CompanyResponse<RawCompanyProfile>>(
      `${ENDPOINTS.COMPANY_SETTINGS}/${id}`,
      payload,
    ),
    getApiMessage('saveCompanyInfoFailed'),
  )
  return normalizeProfile(r.data)
}

export async function deleteCompanySetting(id: string) {
  return assertApiSuccess(
    await http.delete<CompanyResponse<null>>(
      `${ENDPOINTS.COMPANY_SETTINGS}/${id}`,
    ),
    getApiMessage('requestFailed'),
  )
}
