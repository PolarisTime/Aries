import { t } from 'i18next'

type ApiMessageKey = keyof typeof import('@/locales/zh-CN').zhCN.api

export function getApiMessage(key: ApiMessageKey): string {
  return t(`api.${key}`)
}
