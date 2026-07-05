import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchBackendInfo } from '@/api/auth'
import { QUERY_KEYS } from '@/constants/query-keys'
import { frontendVersion } from '@/utils/env'

export function AppVersionFooter() {
  const { t } = useTranslation()
  const { data } = useQuery({
    queryKey: QUERY_KEYS.backendInfo,
    queryFn: fetchBackendInfo,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })
  const resolvedBackendVersion = data?.version || t('common.versionUnknown')

  return (
    <footer className="app-version-footer">
      <span>{t('common.productCopyright')}</span>
      <span>{t('common.frontendVersion', { version: frontendVersion })}</span>
      <span>
        {t('common.backendVersion', { version: resolvedBackendVersion })}
      </span>
    </footer>
  )
}
