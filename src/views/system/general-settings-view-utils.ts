import i18next from 'i18next'
import { STATUS } from '@/constants/status-constants'
import {
  DEFAULT_LIST_PAGE_SIZE_SETTING_CODE,
  isToggleSetting,
} from '@/module-system/settings-constants'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

const HIDE_AUDITED_LIST_RECORDS_SETTING_CODE = 'UI_HIDE_AUDITED_LIST_RECORDS'

export const SYSTEM_SWITCH_HELP_TEXT: Record<string, string> = {
  UI_WEIGHT_ONLY_PURCHASE_INBOUNDS: i18next.t(
    'system.generalSettingsUtils.helpWeightOnlyPurchase',
  ),
  UI_WEIGHT_ONLY_SALES_OUTBOUNDS: i18next.t(
    'system.generalSettingsUtils.helpWeightOnlySales',
  ),
  SYS_CUSTOMER_STATEMENT_RECEIPT_ZERO_FROM_SALES_ORDER: i18next.t(
    'system.generalSettingsUtils.helpCustomerStatementZero',
  ),
  UI_HIDE_AUDITED_LIST_RECORDS: i18next.t(
    'system.generalSettingsUtils.helpHideAuditedRecords',
  ),
}

export const HIDE_AUDITED_STATUS_OPTIONS = [
  {
    label: i18next.t('system.generalSettingsUtils.statusAudited'),
    value: '已审核',
  },
  {
    label: i18next.t('system.generalSettingsUtils.statusCompleted'),
    value: '已完成',
  },
  {
    label: i18next.t('system.generalSettingsUtils.statusPurchaseDone'),
    value: '完成采购',
  },
  {
    label: i18next.t('system.generalSettingsUtils.statusInboundDone'),
    value: '完成入库',
  },
  {
    label: i18next.t('system.generalSettingsUtils.statusSalesDone'),
    value: '完成销售',
  },
  {
    label: i18next.t('system.generalSettingsUtils.statusConfirmed'),
    value: '已确认',
  },
  {
    label: i18next.t('system.generalSettingsUtils.statusPaid'),
    value: '已付款',
  },
  {
    label: i18next.t('system.generalSettingsUtils.statusReceived'),
    value: '已收款',
  },
  {
    label: i18next.t('system.generalSettingsUtils.statusSigned'),
    value: '已签署',
  },
]
export const HIDE_AUDITED_STATUS_VALUES = HIDE_AUDITED_STATUS_OPTIONS.map(
  (option) => option.value,
)

export const GENERAL_SETTING_STATUS_OPTIONS = [
  {
    label: i18next.t('system.generalSettingsUtils.settingStatusEnabled'),
    value: '正常',
  },
  {
    label: i18next.t('system.generalSettingsUtils.settingStatusClosed'),
    value: '禁用',
  },
]

export function buildSystemSettingPayload(
  record: ModuleRecord,
  patch: Partial<ModuleRecord>,
): ModuleRecord {
  return {
    id: record.id,
    settingCode: record.settingCode,
    settingName: record.settingName,
    settingGroup: record.settingGroup,
    settingValue: record.settingValue || 'ON',
    status: asString(record.status) || STATUS.NORMAL,
    remark: record.remark,
    ...patch,
  }
}

export function isDefaultListPageSizeSetting(record: ModuleRecord) {
  return (
    asString(record.settingCode).trim() === DEFAULT_LIST_PAGE_SIZE_SETTING_CODE
  )
}

export function isHideAuditedListRecordsSetting(record: ModuleRecord) {
  return (
    asString(record.settingCode).trim() ===
    HIDE_AUDITED_LIST_RECORDS_SETTING_CODE
  )
}

export function isNumericSetting(record: ModuleRecord) {
  return isDefaultListPageSizeSetting(record)
}

export function isSystemSwitch(record: ModuleRecord) {
  const settingCode = asString(record.settingCode)
  return settingCode.startsWith('UI_') || settingCode.startsWith('SYS_')
}

// isToggleSetting re-exported from @/module-system/settings-constants
export { isToggleSetting }

export function matchesGeneralSettingKeyword(
  record: ModuleRecord,
  searchKeyword: string,
) {
  if (!searchKeyword.trim()) return true
  const normalized = searchKeyword.trim().toLowerCase()
  return [
    record.settingCode,
    record.settingName,
    record.settingGroup,
    record.remark,
  ].some((item) => asString(item).toLowerCase().includes(normalized))
}

export function formatSettingValue(record: ModuleRecord) {
  return asString(record.settingValue)
}

export function resolveHideAuditedStatusValues(settingValue: unknown) {
  const selected = resolveOptionValues(settingValue, HIDE_AUDITED_STATUS_VALUES)
  return selected.length > 0 ? selected : ['已审核']
}

function resolveOptionValues(settingValue: unknown, allowedValues: string[]) {
  const allowed = new Set(allowedValues)
  return asString(settingValue)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => allowed.has(item))
}
