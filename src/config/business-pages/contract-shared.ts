import i18next from 'i18next'

export const contractStatusOptions = [
  { label: i18next.t('modules.status.draft'), value: '草稿' },
  { label: i18next.t('modules.status.executing'), value: '执行中' },
  { label: i18next.t('modules.status.signed'), value: '已签署' },
  { label: i18next.t('modules.status.archived'), value: '已归档' },
]
