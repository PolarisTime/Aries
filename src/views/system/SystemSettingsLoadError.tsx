import { ReloadOutlined } from '@ant-design/icons'
import { Alert, Button } from 'antd'
import { useTranslation } from 'react-i18next'

interface Props {
  retrying: boolean
  onRetry: () => void
}

export function SystemSettingsLoadError({ retrying, onRetry }: Props) {
  const { t } = useTranslation()

  return (
    <Alert
      type="error"
      showIcon
      title={t('api.loadFailed')}
      description={t('result.error.subTitle')}
      action={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          loading={retrying}
          onClick={onRetry}
        >
          {t('errorBoundary.retry')}
        </Button>
      }
    />
  )
}
