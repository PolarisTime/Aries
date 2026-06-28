import { useTranslation } from 'react-i18next'
import { frontendVersion } from '@/utils/env'

interface AppVersionFooterProps {
  backendVersion: string | null
}

export function AppVersionFooter({ backendVersion }: AppVersionFooterProps) {
  const { t } = useTranslation()
  const resolvedBackendVersion = backendVersion || t('common.versionUnknown')

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
