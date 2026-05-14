import { t } from 'i18next'
import type { MessageSchema } from '@/types/i18n'

type ApiMessageKey = keyof MessageSchema['api']

export function getApiMessage(key: ApiMessageKey): string {
  return t(`api.${key}`)
}
