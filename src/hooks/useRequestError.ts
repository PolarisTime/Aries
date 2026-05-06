import { message } from '@/utils/antd-app'

const HANDLED_FLAG = '__leoRequestErrorHandled'

export function useRequestError() {
  const showError = (error: unknown, fallback = '请求失败') => {
    if (isHandledRequestError(error)) return
    const msg = error instanceof Error ? error.message : String(error || fallback)
    message.error(msg)
  }

  return { showError }
}

export function isHandledRequestError(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && (error as Record<string, unknown>)[HANDLED_FLAG] === true,
  )
}
