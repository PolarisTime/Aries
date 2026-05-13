import { asString } from '@/utils/type-narrowing'
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
  useSnowflakeBusinessNo: 'SYS_USE_SNOWFLAKE_ID_AS_BUSINESS_NO',
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

export async function listClientSettings() {
  const { assertApiSuccess, http } = await import('@/api/client')
  const response = assertApiSuccess(
    await http.get<{
      code?: number
      message?: string
      data?: ModuleRecord[]
    }>('/general-setting/client-settings'),
  )
  return Array.isArray(response.data) ? response.data : []
}

export function isDisplaySwitchEnabled(
  rows: ModuleRecord[] | undefined,
  settingCode: string,
) {
  const matched = rows?.find(
    (record) => asString(record.settingCode).trim() === settingCode,
  )
  return asString(matched?.status) === '正常'
}
