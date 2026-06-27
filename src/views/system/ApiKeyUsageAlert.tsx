import { Alert } from 'antd'
import { useTranslation } from 'react-i18next'

export function ApiKeyUsageAlert() {
  const { t } = useTranslation()
  return (
    <Alert
      type="info"
      showIcon
      className="mb-4"
      title={t('system.apiKeyUsage.message')}
    />
  )
}
