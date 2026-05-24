import { isCanceledRequestError } from '@/api/request-errors'
import { message } from '@/utils/antd-app'

export function useRequestError() {
  const showError = (error: unknown, fallback = '请求失败') => {
    if (isCanceledRequestError(error)) {
      return
    }
    const msg =
      error instanceof Error ? error.message : String(error || fallback)
    message.error(msg)
  }

  return { showError }
}