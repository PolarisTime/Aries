import { assertApiSuccess, http } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'

export const DISPLAY_SWITCH_CODES = {
  hideAuditedListRecords: 'UI_HIDE_AUDITED_LIST_RECORDS',
  showSnowflakeId: 'UI_SHOW_SNOWFLAKE_ID',
  weightOnlyPurchaseInbounds: 'UI_WEIGHT_ONLY_PURCHASE_INBOUNDS',
  weightOnlySalesOutbounds: 'UI_WEIGHT_ONLY_SALES_OUTBOUNDS',
} as const

export type DisplaySwitchCode = typeof DISPLAY_SWITCH_CODES[keyof typeof DISPLAY_SWITCH_CODES]

interface DisplaySwitchResponse {
  id?: string | number
  settingCode?: string
  settingName?: string
  billName?: string
  sampleNo?: string
  status?: string
  remark?: string
}

function normalizeSwitch(record: DisplaySwitchResponse): ModuleRecord {
  return {
    ...record,
    id: String(record.id ?? ''),
  }
}

export async function listDisplaySwitches(): Promise<ModuleRecord[]> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<DisplaySwitchResponse[]>>('/general-settings/display-switches'),
    '加载显示设置失败',
  )
  return (response.data || []).map(normalizeSwitch)
}

export function isDisplaySwitchEnabled(
  rows: ModuleRecord[] | undefined,
  settingCode: DisplaySwitchCode | string,
) {
  return Boolean((rows || []).some((row) =>
    String(row.settingCode || '') === settingCode && String(row.status || '') === '正常',
  ))
}
