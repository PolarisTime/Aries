import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'

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

function stripTraceSuffix(message: string): string {
  return message.replace(/\s*\(trace:\s*\S+\)\s*$/, '')
}

export function ErrorView() {
  const router = useRouter()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const error = (router.state as unknown as Record<string, unknown>).error

  const status = getErrorStatus(error)
  const rawMessage = getErrorMessage(error, status, t)
  const subTitle = stripTraceSuffix(rawMessage)
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
      status={status}
      subTitle={subTitle}
      traceId={traceId}
      showHomeButton
      showBackButton
      extra={<Button onClick={handleRetry}>{t('error.retry')}</Button>}
    />
  )
}

function getErrorStatus(error: unknown): '403' | '500' | 'error' {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('403') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    )
      return '403'
    if (msg.includes('500') || msg.includes('internal server')) return '500'
    if (msg.includes('timeout') || msg.includes('network')) return '500'
  }
  return 'error'
}

function getErrorMessage(
  error: unknown,
  status: string,
  t: (key: string) => string,
): string {
  if (status === '403') return t('error.accessDenied')
  if (status === '500') return t('error.serverBusy')
  if (error instanceof Error) {
    const msg = error.message
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
      return t('error.networkError')
    if (msg.length < 100) return msg
    return t('error.serverResponseError')
  }
  return t('error.unknownError')
}
