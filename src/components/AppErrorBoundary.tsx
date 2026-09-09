import { CopyOutlined } from '@ant-design/icons'
import { Button, Typography } from 'antd'
import i18next from 'i18next'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { readRequestError } from '@/api/core/request-errors'
import { AppResult } from '@/components/AppResult'
import { captureFrontendException } from '@/observability/sentry'

interface Props {
  children: ReactNode
  /** 自定义回退展示，不传则用默认 AppResult */
  fallback?: ReactNode
  /** 变化时清除已捕获错误，通常传入当前路由或页面标识 */
  resetKey?: string
}

interface State {
  error: Error | null
  resetKey?: string
}

type ErrorCategory = 'forbidden' | 'network' | 'runtime'
type ResultStatus = '403' | '500' | 'warning' | 'error'

interface ErrorPresentation {
  category: ErrorCategory
  status: ResultStatus
  title?: string
  description?: string
  hint: string
}

const MAX_SUMMARY_LENGTH = 120

const NETWORK_MESSAGE_PATTERNS = [
  'failed to fetch',
  'networkerror',
  'network error',
  'err_network',
  'load failed',
  'timeout',
  'timed out',
  'failed to fetch dynamically imported module',
  'loading chunk',
  'internet disconnected',
]

const HINT_DEFAULTS: Record<ErrorCategory, string> = {
  network: '请检查网络连接后重试',
  forbidden: '请联系管理员开通相关权限',
  runtime: '请刷新页面重试；若问题持续请联系技术支持',
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, resetKey: props.resetKey }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  static getDerivedStateFromProps(
    props: Props,
    state: State,
  ): Partial<State> | null {
    if (props.resetKey === state.resetKey) return null
    return { error: null, resetKey: props.resetKey }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack)
    captureFrontendException(error, { componentStack: info.componentStack })
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  private async handleCopy(text: string) {
    const copied = await copyText(text)
    if (!copied) {
      window.alert(
        i18next.t('errorBoundary.copyFailed', {
          defaultValue: '复制失败，请手动复制',
        }),
      )
    }
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      const { error } = this.state
      const presentation = resolveErrorPresentation(error)
      const { traceId } = readRequestError(error)
      const summary = traceId ? undefined : summarizeErrorMessage(error)
      const copyValue = traceId ?? summary
      const copyLabel = traceId
        ? 'Trace ID'
        : i18next.t('errorBoundary.errorSummary', { defaultValue: '错误摘要' })

      return (
        <AppResult
          className="app-result--page"
          status={presentation.status}
          title={presentation.title}
          subTitle={
            <div
              className="space-y-1"
              data-testid="app-error-boundary-description"
            >
              {presentation.description ? (
                <div>{presentation.description}</div>
              ) : null}
              <div>{presentation.hint}</div>
              {copyValue ? (
                <div className="mt-1 flex items-center gap-2">
                  <Typography.Text
                    type="secondary"
                    className="font-mono text-[11px]"
                    data-testid="app-error-boundary-copy-value"
                  >
                    {copyLabel}: {copyValue}
                  </Typography.Text>
                  <Button
                    size="small"
                    type="text"
                    icon={<CopyOutlined />}
                    aria-label={copyLabel}
                    data-testid="app-error-boundary-copy"
                    onClick={() => {
                      void this.handleCopy(copyValue)
                    }}
                  />
                </div>
              ) : null}
            </div>
          }
          showHomeButton
          showBackButton
          extra={
            <Button
              data-testid="app-error-boundary-retry"
              onClick={this.handleReset}
            >
              {i18next.t('errorBoundary.retry')}
            </Button>
          }
        />
      )
    }

    return this.props.children
  }
}

function classifyError(error: Error): ErrorCategory {
  const { status, code } = readRequestError(error)
  if (status === 403 || code === 403) return 'forbidden'

  const msg = error.message.toLowerCase()
  if (
    msg.includes('403') ||
    msg.includes('forbidden') ||
    msg.includes('unauthorized')
  ) {
    return 'forbidden'
  }
  if (NETWORK_MESSAGE_PATTERNS.some((pattern) => msg.includes(pattern))) {
    return 'network'
  }
  return 'runtime'
}

function resolveErrorPresentation(error: Error): ErrorPresentation {
  const category = classifyError(error)
  const { status, code } = readRequestError(error)
  const msg = error.message.toLowerCase()
  const message = shortMessage(error.message)

  if (category === 'forbidden') {
    return {
      category,
      status: '403',
      description: i18next.t('errorBoundary.accessDenied'),
      hint: i18next.t('errorBoundary.forbiddenHint', {
        defaultValue: HINT_DEFAULTS.forbidden,
      }),
    }
  }

  if (category === 'network') {
    return {
      category,
      status: 'warning',
      title: i18next.t('errorBoundary.networkError'),
      description: message,
      hint: i18next.t('errorBoundary.networkHint', {
        defaultValue: HINT_DEFAULTS.network,
      }),
    }
  }

  if (status === 500 || code === 500 || msg.includes('internal server')) {
    return {
      category,
      status: '500',
      description: i18next.t('errorBoundary.serverBusy'),
      hint: i18next.t('errorBoundary.runtimeHint', {
        defaultValue: HINT_DEFAULTS.runtime,
      }),
    }
  }

  return {
    category,
    status: 'error',
    title: i18next.t('errorBoundary.runtimeTitle', {
      defaultValue: '页面渲染出错',
    }),
    description: message,
    hint: i18next.t('errorBoundary.runtimeHint', {
      defaultValue: HINT_DEFAULTS.runtime,
    }),
  }
}

function shortMessage(message: string): string | undefined {
  const normalized = message.replace(/\s+/g, ' ').trim()
  if (!normalized || normalized.length >= 100) return undefined
  return normalized
}

function summarizeErrorMessage(error: Error): string {
  const normalized = error.message.replace(/\s+/g, ' ').trim()
  return normalized.length > MAX_SUMMARY_LENGTH
    ? `${normalized.slice(0, MAX_SUMMARY_LENGTH)}…`
    : normalized
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
