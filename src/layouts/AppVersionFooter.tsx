import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchBackendInfo } from '@/api/auth'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  frontendBuildTime,
  frontendGitCommit,
  frontendVersion,
} from '@/utils/env'

function formatBuildTime(value: string) {
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/)
  return match ? `${match[1]} ${match[2]}` : trimmed
}

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
  return resolved === fallback ? fallback : formatBuildTime(resolved)
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
    staleTime: 60 * 60 * 1000,
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
