import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export const DEFAULT_LIST_PAGE_SIZE_SETTING_CODE = 'UI_DEFAULT_LIST_PAGE_SIZE'
const DEFAULT_TAX_RATE_SETTING_CODE = 'SYS_DEFAULT_TAX_RATE'
const MAX_CONCURRENT_SESSIONS_CODE = 'SYS_MAX_CONCURRENT_SESSIONS'
const WATERMARK_CONTENT_CODE = 'SYS_WATERMARK_CONTENT'
const WATERMARK_FONT_SIZE_CODE = 'SYS_WATERMARK_FONT_SIZE'
const WATERMARK_ROTATE_CODE = 'SYS_WATERMARK_ROTATE'
const WATERMARK_COLOR_CODE = 'SYS_WATERMARK_COLOR'
const WATERMARK_DENSITY_CODE = 'SYS_WATERMARK_DENSITY'

function isNumericSetting(record: ModuleRecord) {
  const code = asString(record.settingCode).trim()
  return (
    code === DEFAULT_TAX_RATE_SETTING_CODE ||
    code === MAX_CONCURRENT_SESSIONS_CODE ||
    code === DEFAULT_LIST_PAGE_SIZE_SETTING_CODE ||
    code === WATERMARK_CONTENT_CODE ||
    code === WATERMARK_FONT_SIZE_CODE ||
    code === WATERMARK_ROTATE_CODE ||
    code === WATERMARK_COLOR_CODE ||
    code === WATERMARK_DENSITY_CODE
  )
}

export function isToggleSetting(record: ModuleRecord) {
  const code = asString(record.settingCode)
  return (
    !isNumericSetting(record) &&
    (code.startsWith('SYS_') || code.startsWith('UI_'))
  )
}
