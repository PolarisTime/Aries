import type { TFunction } from 'i18next'

export function buildApiKeyStatusOptions(t: TFunction) {
  return [
    { label: t('system.apiKeyForm.statusValid'), value: '有效' },
    { label: t('system.apiKeyForm.statusExpired'), value: '已过期' },
    { label: t('system.apiKeyForm.statusRevoked'), value: '已禁用' },
  ]
}

export function buildApiKeyUsageScopeOptions(t: TFunction) {
  return [
    { label: t('system.apiKeyForm.scopeAll'), value: '全部接口' },
    { label: t('system.apiKeyForm.scopeReadonly'), value: '只读接口' },
    { label: t('system.apiKeyForm.scopeBusiness'), value: '业务接口' },
  ]
}
