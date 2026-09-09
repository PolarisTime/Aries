import { CopyOutlined } from '@ant-design/icons'
import { Button, Typography } from 'antd'
import i18next from 'i18next'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { readRequestError } from '@/api/core/request-errors'
import { AppResult } from '@/components/AppResult'
import { captureFrontendException } from '@/observability/sentry'
import {
  resolveErrorPresentation,
  summarizeErrorMessage,
} from '@/utils/error-presentation'

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

async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
