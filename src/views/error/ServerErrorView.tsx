import { useLocation, useNavigate } from '@tanstack/react-router'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'
import { resolveServerErrorRetryPath } from '@/utils/server-error-navigation'

export function ServerErrorView() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const handleRetry = () => {
    const retryPath = resolveServerErrorRetryPath(location.searchStr)
    void navigate({ to: retryPath as '/' })
  }

  return (
    <main className="server-error-page">
      <AppResult
        className="server-error-result"
        status="warning"
        title={t('error.serverError.title')}
        subTitle={t('error.serverError.subTitle')}
        extra={
          <Button type="primary" onClick={handleRetry}>
            {t('error.retry')}
          </Button>
        }
      />
    </main>
  )
}
