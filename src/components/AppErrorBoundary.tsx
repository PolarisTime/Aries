import Button from 'antd/es/button'
import i18next from 'i18next'
import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { AppResult } from '@/components/AppResult'

interface Props {
  children: ReactNode
  /** 自定义回退展示，不传则用默认 AppResult */
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      const { error } = this.state
      const status = getStatus(error)
      const message = getMessage(error, status)
      const traceId = extractTraceId(error)

      return (
        <AppResult
          status={status}
          subTitle={message}
          traceId={traceId}
          showHomeButton
          showBackButton
          extra={
            <Button onClick={this.handleReset}>
              {i18next.t('errorBoundary.retry')}
            </Button>
          }
        />
      )
    }

    return this.props.children
  }
}

function extractTraceId(error: Error): string | undefined {
  const obj = error as Error & { traceId?: string }
  if (typeof obj.traceId === 'string' && obj.traceId.length > 0)
    return obj.traceId
  return undefined
}

function getStatus(error: Error): '403' | '500' | 'error' {
  const msg = error.message.toLowerCase()
  if (
    msg.includes('403') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden')
  )
    return '403'
  if (msg.includes('500') || msg.includes('internal server')) return '500'
  return 'error'
}

function getMessage(error: Error, status: string): string {
  if (status === '403') return i18next.t('errorBoundary.noPermission')
  if (status === '500') return i18next.t('errorBoundary.serverBusy')
  const msg = error.message
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
    return i18next.t('errorBoundary.networkError')
  if (msg.includes('timeout')) return i18next.t('errorBoundary.timeout')
  if (msg.length < 100) return msg
  return i18next.t('errorBoundary.serverError')
}
