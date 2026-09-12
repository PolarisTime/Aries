import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { listCompanySettings } from '@/api/system/company-settings'
import { QUERY_KEYS } from '@/constants/query-keys'

/** 结算主体对应对账单的结算账户选项；仅启用中的账户可选。 */
export function useModuleEditorSettlementAccounts({
  open,
  enabled,
  settlementCompanyId,
}: {
  open: boolean
  enabled: boolean
  settlementCompanyId: unknown
}) {
  const { data: companyProfiles = [] } = useQuery({
    queryKey: QUERY_KEYS.companySettings,
    queryFn: listCompanySettings,
    enabled: open && enabled,
  })

  const settlementAccountOptions = useMemo(() => {
    const companyId = String(settlementCompanyId || '')
    if (!companyId) return []
    const profile = companyProfiles.find((item) => item.id === companyId)
    return (profile?.settlementAccounts || []).flatMap((account) => {
      if (account.status === '停用') return []
      const value = String(account.id || '')
      const label =
        account.accountName.trim() ||
        account.bankName?.trim() ||
        account.bankAccount?.trim() ||
        `账户#${value}`
      return value ? [{ label, value }] : []
    })
  }, [companyProfiles, settlementCompanyId])

  return settlementAccountOptions
}
