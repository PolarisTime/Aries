import {
  isCanceledRequestError,
  isHandledRequestError as isHandledRequestErrorFlagged,
} from '@/api/request-errors'
import { message } from '@/utils/antd-app'

export function useRequestError() {
  const showError = (error: unknown, fallback = '请求失败') => {
    if (isHandledRequestErrorFlagged(error) || isCanceledRequestError(error)) {
      return
    }
    const msg =
      error instanceof Error ? error.message : String(error || fallback)
    message.error(msg)
  }

  return { showError }
}

export function isHandledRequestError(error: unknown): boolean {
  return isHandledRequestErrorFlagged(error)
}
