import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'
import { resolveErrorPresentation } from '@/utils/error-presentation'

function extractBackendTraceId(error: unknown): string | undefined {
  if (error == null) return undefined
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>
    const backendTrace =
      obj.traceId ?? obj.trace_id ?? obj.requestId ?? obj.request_id
    if (typeof backendTrace === 'string' && backendTrace.length > 0)
      return backendTrace
  }
  return undefined
}

export function ErrorView() {
  const router = useRouter()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const error = (router.state as unknown as Record<string, unknown>).error

  // 与 AppErrorBoundary 共用同一套分类规则（403/网络/500/运行时）与恢复建议文案。
  const presentation = resolveErrorPresentation(error)
  const traceId = extractBackendTraceId(error)

  useEffect(() => {
    if (error)
      console.error(
        traceId ? `[ErrorView] traceId=${traceId}` : '[ErrorView]',
        error,
      )
  }, [error, traceId])

  const handleRetry = () => {
    void navigate({ to: router.state.location.pathname as '/' })
  }

  return (
    <AppResult
      className="app-result--page"
      status={presentation.status}
      title={presentation.title}
      subTitle={
        <div className="space-y-1">
          {presentation.description ? (
            <div>{presentation.description}</div>
          ) : null}
          <div>{presentation.hint}</div>
        </div>
      }
      traceId={traceId}
      showHomeButton
      showBackButton
      extra={<Button onClick={handleRetry}>{t('errorBoundary.retry')}</Button>}
    />
  )
}
