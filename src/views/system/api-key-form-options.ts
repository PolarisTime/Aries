import i18next from 'i18next'

export const apiKeyStatusOptions = [
  { label: i18next.t('system.apiKeyForm.statusValid'), value: '有效' },
  { label: i18next.t('system.apiKeyForm.statusExpired'), value: '已过期' },
  { label: i18next.t('system.apiKeyForm.statusRevoked'), value: '已禁用' },
]

export const apiKeyUsageScopeOptions = [
  { label: i18next.t('system.apiKeyForm.scopeAll'), value: '全部接口' },
  { label: i18next.t('system.apiKeyForm.scopeReadonly'), value: '只读接口' },
  { label: i18next.t('system.apiKeyForm.scopeBusiness'), value: '业务接口' },
]
