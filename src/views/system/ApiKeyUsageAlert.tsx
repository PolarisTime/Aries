import Alert from 'antd/es/alert'
import { useTranslation } from 'react-i18next'

export function ApiKeyUsageAlert() {
  const { t } = useTranslation()
  return (
    <Alert
      type="info"
      showIcon
      className="mb-4"
      title={t('system.apiKeyUsage.title')}
      description={
        <div className="grid gap-4 leading-relaxed">
          <div>
            1. {t('system.apiKeyUsage.item1')}
          </div>
          <div>
            2. {t('system.apiKeyUsage.item2')}
          </div>
          <div>
            3. {t('system.apiKeyUsage.item3')}
          </div>
          <div>
            4. {t('system.apiKeyUsage.item4')}
          </div>
          <div>
            5. {t('system.apiKeyUsage.item5')}
          </div>
          <div>
            6. {t('system.apiKeyUsage.item6')}
          </div>
          <div>
            7. {t('system.apiKeyUsage.item7')}
          </div>
          <div>8. {t('system.apiKeyUsage.item8')}</div>
        </div>
      }
    />
  )
}
