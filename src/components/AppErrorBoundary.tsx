import Button from 'antd/es/button'
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
          subTitle={traceId ? `${message} (Trace: ${traceId})` : message}
          showHomeButton
          showBackButton
          extra={<Button onClick={this.handleReset}>重试</Button>}
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
  if (status === '403') return '抱歉，您没有权限访问此页面'
  if (status === '500') return '服务器繁忙，请稍后重试'
  const msg = error.message
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
    return '网络连接异常'
  if (msg.includes('timeout')) return '请求超时'
  if (msg.length < 100) return msg
  return '服务器响应异常，请稍后重试'
}
