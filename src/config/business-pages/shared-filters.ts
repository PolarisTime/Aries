import { enabledStatusOptions } from '@/constants/module-options'

export const masterStatusFilter = {
  key: 'status' as const,
  label: '状态',
  type: 'select' as const,
  options: enabledStatusOptions,
}
