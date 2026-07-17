import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export const DEFAULT_LIST_PAGE_SIZE_SETTING_CODE = 'UI_DEFAULT_LIST_PAGE_SIZE'
const DEFAULT_TAX_RATE_SETTING_CODE = 'SYS_DEFAULT_TAX_RATE'
const MAX_CONCURRENT_SESSIONS_CODE = 'SYS_MAX_CONCURRENT_SESSIONS'

function isNumericSetting(record: ModuleRecord) {
  const code = asString(record.settingCode).trim()
  return (
    code === DEFAULT_TAX_RATE_SETTING_CODE ||
    code === MAX_CONCURRENT_SESSIONS_CODE ||
    code === DEFAULT_LIST_PAGE_SIZE_SETTING_CODE
  )
}

export function isToggleSetting(record: ModuleRecord) {
  const code = asString(record.settingCode)
  return (
    !isNumericSetting(record) &&
    (code.startsWith('SYS_') || code.startsWith('UI_'))
  )
}
