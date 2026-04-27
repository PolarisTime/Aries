import { message } from 'ant-design-vue'
import { isHandledRequestError } from '@/api/client'

export function useRequestError() {
  return (error: unknown, fallbackMessage: string) => {
    if (isHandledRequestError(error)) {
      return
    }

    message.error(error instanceof Error ? error.message : fallbackMessage)
  }
}
