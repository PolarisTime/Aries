import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export const DEFAULT_LIST_PAGE_SIZE_SETTING_CODE = 'UI_DEFAULT_LIST_PAGE_SIZE'

function isNumericSetting(record: ModuleRecord) {
  const code = asString(record.settingCode).trim()
  return code === DEFAULT_LIST_PAGE_SIZE_SETTING_CODE
}

export function isToggleSetting(record: ModuleRecord) {
  const code = asString(record.settingCode)
  return (
    !isNumericSetting(record) &&
    (code.startsWith('SYS_') || code.startsWith('UI_'))
  )
}
