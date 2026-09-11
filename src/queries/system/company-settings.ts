import {
  fetchSettlementCompanyOptions,
  type SettlementCompanyOption,
} from '@/api/system/company-settings'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/queries/query-cached-options'

const settlementCompanyOptions =
  createQueryCachedOptions<SettlementCompanyOption>({
    queryKey: QUERY_KEYS.masterOptions.settlementCompany,
    fetch: fetchSettlementCompanyOptions,
  })

export const getSettlementCompanyOptions = settlementCompanyOptions.get
export const reloadSettlementCompanyOptions = settlementCompanyOptions.reload
