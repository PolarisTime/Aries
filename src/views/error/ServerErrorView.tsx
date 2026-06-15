import Button from 'antd/es/button'
import Result from 'antd/es/result'
import { useTranslation } from 'react-i18next'

export function ServerErrorView() {
  const { t } = useTranslation()

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f5f5f5',
      }}
    >
      <Result
        status="warning"
        title={t('error.serverError.title')}
        subTitle={t('error.serverError.subTitle')}
        extra={
          <Button type="primary" onClick={handleRetry}>
            {t('error.retry')}
          </Button>
        }
      />
    </div>
  )
}
