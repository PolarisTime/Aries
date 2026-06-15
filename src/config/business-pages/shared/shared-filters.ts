import i18next from 'i18next'
import { enabledStatusOptions } from '@/constants/module-options'

export const masterStatusFilter = {
  key: 'status' as const,
  label: i18next.t('modules.filter.status'),
  type: 'select' as const,
  options: enabledStatusOptions,
}
