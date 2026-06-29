import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export const SETTLEMENT_COMPANY_LABEL = '结算主体'

function normalizeSettlementCompanyId(value: unknown) {
  return asString(value).trim()
}

export function validateSameSettlementCompany(
  currentRecord: ModuleRecord | Record<string, unknown>,
  parentRecord: ModuleRecord | Record<string, unknown>,
  message: string,
) {
  const currentId = normalizeSettlementCompanyId(
    currentRecord.settlementCompanyId,
  )
  const parentId = normalizeSettlementCompanyId(
    parentRecord.settlementCompanyId,
  )
  if (currentId && parentId && currentId !== parentId) {
    return message
  }
  return null
}
