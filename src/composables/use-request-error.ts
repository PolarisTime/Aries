import { message } from 'ant-design-vue'
import { isHandledRequestError } from '@/api/client'

export function showRequestError(error: unknown, fallbackMessage: string) {
  if (isHandledRequestError(error)) {
    return
  }
  message.error(error instanceof Error ? error.message : fallbackMessage)
}

/** @deprecated Use showRequestError directly instead of the factory pattern. */
export function useRequestError() {
  return showRequestError
}
