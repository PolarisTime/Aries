import {
  listAllBusinessModuleRows,
  saveBusinessModule,
  updatePageUploadRule,
} from '@/api/business'
import type { UploadRulePayload } from '@/api/business-types'
import type { ModuleRecord } from '@/types/module-page'
import { isToggleSetting } from '@/views/system/general-settings-view-utils'

const MODULE_KEY = 'general-setting'

export const DISPLAY_SWITCH_CODES = {
  weightOnlyPurchaseInbounds: 'UI_WEIGHT_ONLY_PURCHASE_INBOUNDS',
  weightOnlySalesOutbounds: 'UI_WEIGHT_ONLY_SALES_OUTBOUNDS',
  showSnowflakeId: 'UI_SHOW_SNOWFLAKE_ID',
} as const

export function listSystemSettings() {
  return listAllBusinessModuleRows(MODULE_KEY, {})
}

export function saveSystemSetting(record: ModuleRecord) {
  return saveBusinessModule(MODULE_KEY, record)
}

export function updateSystemUploadRule(record: UploadRulePayload) {
  return updatePageUploadRule(MODULE_KEY, record)
}

export async function listDisplaySwitches() {
  const rows = await listSystemSettings()
  return rows.filter(isToggleSetting)
}

export function isDisplaySwitchEnabled(
  rows: ModuleRecord[] | undefined,
  settingCode: string,
) {
  const matched = rows?.find(
    (record) => String(record.settingCode || '').trim() === settingCode,
  )
  return String(matched?.status || '') === '正常'
}
