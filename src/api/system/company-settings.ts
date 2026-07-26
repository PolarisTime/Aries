import { z } from 'zod'
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  assertApiSuccess,
} from '@/api/core/client'
import { pageContent } from '@/api/core/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/lib/query-cached-options'
import {
  apiResponseSchema,
  nullResponseSchema,
  rawPageSchema,
} from '@/shared/schemas/api'
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

const responseIdSchema = z.union([z.string(), z.number()])
const rawSettlementAccountSchema = z.object({
  id: responseIdSchema.nullish(),
  accountName: z.string().nullish(),
  bankName: z.string().nullish(),
  bankAccount: z.string().nullish(),
  usageType: z.string().nullish(),
  status: z.string().nullish(),
  remark: z.string().nullish(),
})
const rawCompanyProfileSchema = z.object({
  id: responseIdSchema,
  companyName: z.string(),
  taxNo: z.string(),
  bankName: z.string().nullish(),
  bankAccount: z.string().nullish(),
  settlementAccounts: z.array(rawSettlementAccountSchema).optional(),
  status: z.string(),
  remark: z.string().nullish(),
})
const rawSettlementCompanyOptionSchema = z.object({
  id: responseIdSchema,
  companyName: z.string(),
  taxNo: z.string().optional(),
  status: z.string().optional(),
})
const currentCompanyResponseSchema = apiResponseSchema(
  rawCompanyProfileSchema.nullish(),
)
const companyPageResponseSchema = apiResponseSchema(
  rawPageSchema(rawCompanyProfileSchema),
)
const companyResponseSchema = apiResponseSchema(rawCompanyProfileSchema)

export type RawSettlementAccount = z.output<typeof rawSettlementAccountSchema>
export type RawCompanyProfile = z.output<typeof rawCompanyProfileSchema>
export type RawSettlementCompanyOption = z.output<
  typeof rawSettlementCompanyOptionSchema
>

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

function normalizeProfile(
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
    await apiGet(
      ENDPOINTS.COMPANY_SETTINGS_CURRENT,
      currentCompanyResponseSchema,
    ),
    getApiMessage('loadCompanyInfoFailed'),
  )
  return normalizeProfile(r.data)
}

export async function listCompanySettings() {
  const r = assertApiSuccess(
    await apiGet(ENDPOINTS.COMPANY_SETTINGS, companyPageResponseSchema, {
      params: { page: 0, size: 200, sortBy: 'id', direction: 'asc' },
    }),
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
  itemSchema: rawSettlementCompanyOptionSchema,
  normalizer: normalizeSettlementCompanyOptions,
})

export const fetchSettlementCompanyOptions = settlementCompanyOptions.fetch
export const reloadSettlementCompanyOptions = settlementCompanyOptions.reload

export function getSettlementCompanyOptions(): SettlementCompanyOption[] {
  return settlementCompanyOptions.get()
}

export async function createCompanySetting(
  payload: Omit<CompanySettingProfile, 'id'>,
) {
  const r = assertApiSuccess(
    await apiPost(ENDPOINTS.COMPANY_SETTINGS, companyResponseSchema, payload),
    getApiMessage('saveCompanyInfoFailed'),
  )
  return normalizeProfile(r.data)
}

export async function updateCompanySetting(
  id: string,
  payload: Omit<CompanySettingProfile, 'id'>,
) {
  const r = assertApiSuccess(
    await apiPut(
      `${ENDPOINTS.COMPANY_SETTINGS}/${id}`,
      companyResponseSchema,
      payload,
    ),
    getApiMessage('saveCompanyInfoFailed'),
  )
  return normalizeProfile(r.data)
}

export async function deleteCompanySetting(id: string) {
  return assertApiSuccess(
    await apiDelete(`${ENDPOINTS.COMPANY_SETTINGS}/${id}`, nullResponseSchema),
    getApiMessage('requestFailed'),
  )
}
