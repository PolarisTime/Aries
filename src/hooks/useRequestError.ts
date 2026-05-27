import { isCanceledRequestError } from '@/api/request-errors'
import { useTranslation } from 'react-i18next'
import { message } from '@/utils/antd-app'

export function useRequestError() {
  const { t } = useTranslation()

  const showError = (error: unknown, fallback = t('hooks.requestError.requestFailed')) => {
    if (isCanceledRequestError(error)) {
      return
    }
    const msg =
      error instanceof Error ? error.message : String(error || fallback)
    message.error(msg)
  }

  return { showError }
}
