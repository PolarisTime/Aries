import i18next from 'i18next'
import type {
  ApiKeyActionOption,
  ApiKeyResourceOption,
  ApiKeyUserOption,
} from '@/api/api-keys'

export function getApiKeyStatusColor(status: string) {
  if (status === '有效') return 'green'
  if (status === '已过期') return 'orange'
  if (status === '已禁用') return 'red'
  return 'default'
}

export function getApiKeyUserDisplayName(
  user: Pick<ApiKeyUserOption, 'userName' | 'loginName'>,
) {
  return user.userName
    ? `${user.userName}（${user.loginName}）`
    : user.loginName
}

export function getApiKeyAllowedResourceText(
  allowedResources: string[],
  resourceOptions: ApiKeyResourceOption[],
) {
  if (!allowedResources?.length) return i18next.t('system.apiKeyUtils.unlimited')
  const titleByCode = new Map(
    resourceOptions.map((item) => [item.code, item.title]),
  )
  return allowedResources
    .map((item) => titleByCode.get(item) || item)
    .join('、')
}

export function getApiKeyAllowedActionText(
  allowedActions: string[],
  actionOptions: ApiKeyActionOption[],
) {
  if (!allowedActions?.length) return i18next.t('system.apiKeyUtils.unset')
  const titleByCode = new Map(
    actionOptions.map((item) => [item.code, item.title]),
  )
  return allowedActions.map((item) => titleByCode.get(item) || item).join('、')
}
