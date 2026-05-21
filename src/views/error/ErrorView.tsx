import Button from 'antd/es/button'
import Typography from 'antd/es/typography'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
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
  const error = router.state.error

  const status = getErrorStatus(error)
  const rawMessage = getErrorMessage(error, status)
  const subTitle = stripTraceSuffix(rawMessage)
  const traceId = useMemo(() => extractBackendTraceId(error), [error])

  useEffect(() => {
    if (error)
      console.error(
        traceId ? `[ErrorView] traceId=${traceId}` : '[ErrorView]',
        error,
      )
  }, [error, traceId])

  const handleRetry = useCallback(() => {
    void navigate({ to: router.state.location.pathname as '/' })
  }, [navigate, router.state.location.pathname])

  return (
    <AppResult
      status={status}
      subTitle={
        <>
          <div>{subTitle}</div>
          {traceId ? (
            <Typography.Text
              type="secondary"
              copyable={{ text: traceId }}
              className="font-mono text-[11px]"
            >
              Trace ID: {traceId}
            </Typography.Text>
          ) : null}
        </>
      }
      showHomeButton
      showBackButton
      extra={
        <Button onClick={handleRetry}>重试</Button>
      }
    />
  )
}

function getErrorStatus(error: unknown): '403' | '500' | 'error' {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden')) return '403'
    if (msg.includes('500') || msg.includes('internal server')) return '500'
    if (msg.includes('timeout') || msg.includes('network')) return '500'
  }
  return 'error'
}

function getErrorMessage(error: unknown, status: string): string {
  if (status === '403') return '抱歉，您没有权限访问此页面'
  if (status === '500') return '服务器繁忙，请稍后重试'
  if (error instanceof Error) {
    const msg = error.message
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
      return '网络连接异常，请检查网络后重试'
    if (msg.includes('timeout')) return '请求超时，请稍后重试'
    if (msg.length < 100) return msg
    return '服务器响应异常，请稍后重试'
  }
  return '发生了未知错误，请点击重试按钮'
}
