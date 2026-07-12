import { useTranslation } from 'react-i18next'
import { isCanceledRequestError, readRequestError } from '@/api/request-errors'
import { message } from '@/utils/antd-app'

export function useRequestError() {
  const { t } = useTranslation()

  const showError = (
    error: unknown,
    fallback = t('hooks.requestError.requestFailed'),
  ) => {
    if (isCanceledRequestError(error)) {
      return
    }
    if (readRequestError(error).handled) {
      return
    }
    const msg =
      error instanceof Error ? error.message : String(error || fallback)
    message.error(msg)
  }

  return { showError }
}
