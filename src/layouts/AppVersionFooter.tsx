import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchBackendInfo } from '@/api/auth/auth-api'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_LONG } from '@/constants/query-policies'
import { formatBuildMomentForDisplay } from '@/utils/buildInfo'
import {
  frontendBuildTime,
  frontendGitCommit,
  frontendVersion,
} from '@/utils/env'

function resolveDisplayValue(
  value: string | null | undefined,
  fallback: string,
) {
  const trimmed = value?.trim()
  if (!trimmed || trimmed === 'unknown') {
    return fallback
  }
  return trimmed
}

function resolveBuildTime(value: string | null | undefined, fallback: string) {
  const resolved = resolveDisplayValue(value, fallback)
  // 展示口径(含 UTC→业务时区换算)统一在 utils/buildInfo 里, 这里不再另写一份。
  return resolved === fallback
    ? fallback
    : formatBuildMomentForDisplay(resolved, fallback)
}

function resolveGitCommit(value: string | null | undefined, fallback: string) {
  const resolved = resolveDisplayValue(value, fallback)
  return resolved === fallback ? fallback : resolved.slice(0, 8)
}

export function AppVersionFooter() {
  const { t } = useTranslation()
  const { data } = useQuery({
    queryKey: QUERY_KEYS.backendInfo,
    queryFn: fetchBackendInfo,
    staleTime: STALE_LONG,
    gcTime: 2 * 60 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })
  const unknownText = t('common.versionUnknown')
  const currentYear = String(new Date().getFullYear())
  const resolvedBackendVersion = resolveDisplayValue(data?.version, unknownText)
  const resolvedBackendBuildTime = resolveBuildTime(
    data?.buildTime,
    unknownText,
  )
  const resolvedBackendGitCommit = resolveGitCommit(
    data?.gitCommit,
    unknownText,
  )
  const resolvedFrontendBuildTime = resolveBuildTime(
    frontendBuildTime,
    unknownText,
  )
  const resolvedFrontendGitCommit = resolveGitCommit(
    frontendGitCommit,
    unknownText,
  )

  return (
    <footer className="app-version-footer">
      <span>{t('common.productCopyright', { year: currentYear })}</span>
      <span>
        {t('common.frontendVersion', {
          version: frontendVersion,
          buildTime: resolvedFrontendBuildTime,
          gitCommit: resolvedFrontendGitCommit,
        })}
      </span>
      <span>
        {t('common.backendVersion', {
          version: resolvedBackendVersion,
          buildTime: resolvedBackendBuildTime,
          gitCommit: resolvedBackendGitCommit,
        })}
      </span>
    </footer>
  )
}
