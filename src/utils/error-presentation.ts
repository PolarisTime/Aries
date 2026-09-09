/**
 * 错误分类与展示文案的共享模块：路由 ErrorView 与 AppErrorBoundary
 * 使用同一套分类规则（403 / 网络 / 500 / 运行时）与恢复建议文案，
 * i18n 复用 errorBoundary.* 既有键。
 */
import i18next from 'i18next'
import { readRequestError } from '@/api/core/request-errors'

export type ErrorCategory = 'forbidden' | 'network' | 'runtime'
export type ErrorResultStatus = '403' | '500' | 'warning' | 'error'

export interface ErrorPresentation {
  category: ErrorCategory
  status: ErrorResultStatus
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

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return ''
}

function shortMessage(message: string): string | undefined {
  const normalized = message.replace(/\s+/g, ' ').trim()
  if (!normalized || normalized.length >= 100) return undefined
  return normalized
}

/** 错误分类：403/权限 → forbidden，网络类 → network，其余 → runtime。 */
export function classifyError(error: unknown): ErrorCategory {
  const { status, code } = readRequestError(error)
  if (status === 403 || code === 403) return 'forbidden'

  const msg = readErrorMessage(error).toLowerCase()
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

/** 按分类规则解析 AppResult 所需的状态图标、标题、描述与恢复建议。 */
export function resolveErrorPresentation(error: unknown): ErrorPresentation {
  const category = classifyError(error)
  const { status, code } = readRequestError(error)
  const msg = readErrorMessage(error).toLowerCase()
  const message = shortMessage(readErrorMessage(error))

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

/** 截断后的错误摘要，用于无 traceId 时的复制与展示。 */
export function summarizeErrorMessage(error: unknown): string {
  const normalized = readErrorMessage(error).replace(/\s+/g, ' ').trim()
  return normalized.length > MAX_SUMMARY_LENGTH
    ? `${normalized.slice(0, MAX_SUMMARY_LENGTH)}…`
    : normalized
}
