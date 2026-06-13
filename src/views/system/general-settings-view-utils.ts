import Typography from 'antd/es/typography'
import i18next from 'i18next'
import { createElement } from 'react'
import { STATUS } from '@/constants/status-constants'
import {
  DEFAULT_LIST_PAGE_SIZE_SETTING_CODE,
  isToggleSetting,
} from '@/module-system/settings-constants'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

const DEFAULT_TAX_RATE_SETTING_CODE = 'SYS_DEFAULT_TAX_RATE'
const MAX_CONCURRENT_SESSIONS_CODE = 'SYS_MAX_CONCURRENT_SESSIONS'
const WATERMARK_CONTENT_CODE = 'SYS_WATERMARK_CONTENT'
export const WATERMARK_FONT_SIZE_CODE = 'SYS_WATERMARK_FONT_SIZE'
const WATERMARK_ROTATE_CODE = 'SYS_WATERMARK_ROTATE'
export const WATERMARK_COLOR_CODE = 'SYS_WATERMARK_COLOR'
export const WATERMARK_DENSITY_CODE = 'SYS_WATERMARK_DENSITY'
export const DETAILED_OPERATION_LOG_SETTING_CODE =
  'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS'
const HIDE_AUDITED_LIST_RECORDS_SETTING_CODE = 'UI_HIDE_AUDITED_LIST_RECORDS'

export const SYSTEM_SWITCH_HELP_TEXT: Record<string, string> = {
  SYS_DEFAULT_TAX_RATE: i18next.t(
    'system.generalSettingsUtils.helpDefaultTaxRate',
  ),
  SYS_MAX_CONCURRENT_SESSIONS: i18next.t(
    'system.generalSettingsUtils.helpMaxConcurrentSessions',
  ),
  UI_WEIGHT_ONLY_PURCHASE_INBOUNDS: i18next.t(
    'system.generalSettingsUtils.helpWeightOnlyPurchase',
  ),
  UI_WEIGHT_ONLY_SALES_OUTBOUNDS: i18next.t(
    'system.generalSettingsUtils.helpWeightOnlySales',
  ),
  SYS_CUSTOMER_STATEMENT_RECEIPT_ZERO_FROM_SALES_ORDER: i18next.t(
    'system.generalSettingsUtils.helpCustomerStatementZero',
  ),
  SYS_SUPPLIER_STATEMENT_FULL_PAYMENT_FROM_PURCHASE: i18next.t(
    'system.generalSettingsUtils.helpSupplierStatementFull',
  ),
  SYS_OPERATION_LOG_RECORD_ALL_WRITE: i18next.t(
    'system.generalSettingsUtils.helpOperationLogAllWrite',
  ),
  SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS: i18next.t(
    'system.generalSettingsUtils.helpOperationLogDetailed',
  ),
  SYS_OPERATION_LOG_RECORD_AUTH_EVENTS: i18next.t(
    'system.generalSettingsUtils.helpOperationLogAuth',
  ),
  SYS_FORCE_USER_TOTP_ON_FIRST_LOGIN: i18next.t(
    'system.generalSettingsUtils.helpForceTotpOnFirstLogin',
  ),
  SYS_BATCH_NO_AUTO_GENERATE: i18next.t(
    'system.generalSettingsUtils.helpBatchNoAutoGenerate',
  ),
  SYS_FORCE_BATCH_MANAGEMENT: i18next.t(
    'system.generalSettingsUtils.helpForceBatchManagement',
  ),
  UI_HIDE_AUDITED_LIST_RECORDS: i18next.t(
    'system.generalSettingsUtils.helpHideAuditedRecords',
  ),
  UI_SHOW_SNOWFLAKE_ID: i18next.t(
    'system.generalSettingsUtils.helpShowSnowflakeId',
  ),
  SYS_USE_SNOWFLAKE_ID_AS_BUSINESS_NO: i18next.t(
    'system.generalSettingsUtils.helpUseSnowflakeAsBusinessNo',
  ),
  SYS_LOGIN_CAPTCHA: i18next.t('system.generalSettingsUtils.helpLoginCaptcha'),
  SYS_ATTACHMENT_WATERMARK_ENABLED: i18next.t(
    'system.generalSettingsUtils.helpAttachmentWatermark',
  ),
}

export const DETAILED_OPERATION_ACTION_OPTIONS = [
  {
    label: i18next.t('system.generalSettingsUtils.actionQuery'),
    value: 'QUERY',
  },
  {
    label: i18next.t('system.generalSettingsUtils.actionDetail'),
    value: 'DETAIL',
  },
  {
    label: i18next.t('system.generalSettingsUtils.actionCreate'),
    value: 'CREATE',
  },
  { label: i18next.t('system.generalSettingsUtils.actionEdit'), value: 'EDIT' },
  {
    label: i18next.t('system.generalSettingsUtils.actionDelete'),
    value: 'DELETE',
  },
  {
    label: i18next.t('system.generalSettingsUtils.actionAudit'),
    value: 'AUDIT',
  },
  {
    label: i18next.t('system.generalSettingsUtils.actionExport'),
    value: 'EXPORT',
  },
  {
    label: i18next.t('system.generalSettingsUtils.actionPrint'),
    value: 'PRINT',
  },
]
export const DETAILED_OPERATION_ACTION_VALUES =
  DETAILED_OPERATION_ACTION_OPTIONS.map((option) => option.value)

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

export function isDefaultTaxRateSetting(record: ModuleRecord) {
  return asString(record.settingCode).trim() === DEFAULT_TAX_RATE_SETTING_CODE
}

export function buildSystemSettingPayload(
  record: ModuleRecord,
  patch: Partial<ModuleRecord>,
): ModuleRecord {
  return {
    id: record.id,
    settingCode: record.settingCode,
    settingName: record.settingName,
    billName: record.billName,
    prefix: record.prefix || 'SYS',
    dateRule: record.dateRule || 'NONE',
    serialLength: record.serialLength || 1,
    resetRule: record.resetRule || 'NEVER',
    sampleNo: record.sampleNo || 'ON',
    status: asString(record.status) || STATUS.NORMAL,
    remark: record.remark,
    ...patch,
  }
}

function isMaxConcurrentSetting(record: ModuleRecord) {
  return asString(record.settingCode).trim() === MAX_CONCURRENT_SESSIONS_CODE
}

export function isDefaultListPageSizeSetting(record: ModuleRecord) {
  return (
    asString(record.settingCode).trim() === DEFAULT_LIST_PAGE_SIZE_SETTING_CODE
  )
}

export function isWatermarkContentSetting(record: ModuleRecord) {
  const code = asString(record.settingCode).trim()
  return code === WATERMARK_CONTENT_CODE || code === WATERMARK_COLOR_CODE
}

export function isWatermarkPropSetting(record: ModuleRecord) {
  const code = asString(record.settingCode).trim()
  return (
    code === WATERMARK_FONT_SIZE_CODE ||
    code === WATERMARK_ROTATE_CODE ||
    code === WATERMARK_DENSITY_CODE
  )
}

export function isDetailedOperationLogSetting(record: ModuleRecord) {
  return (
    asString(record.settingCode).trim() === DETAILED_OPERATION_LOG_SETTING_CODE
  )
}

export function isHideAuditedListRecordsSetting(record: ModuleRecord) {
  return (
    asString(record.settingCode).trim() ===
    HIDE_AUDITED_LIST_RECORDS_SETTING_CODE
  )
}

export function isNumericSetting(record: ModuleRecord) {
  return (
    isDefaultTaxRateSetting(record) ||
    isMaxConcurrentSetting(record) ||
    isDefaultListPageSizeSetting(record) ||
    isWatermarkPropSetting(record) ||
    isWatermarkContentSetting(record)
  )
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
    record.billName,
    record.remark,
  ].some((item) => asString(item).toLowerCase().includes(normalized))
}

export function formatSettingValue(record: ModuleRecord) {
  if (isDefaultTaxRateSetting(record)) {
    const value = Number(record.sampleNo || 0)
    return value ? `${(value * 100).toFixed(0)}%` : '13%'
  }
  if (isMaxConcurrentSetting(record)) {
    return asString(record.sampleNo)
  }
  if (asString(record.settingCode).trim() === WATERMARK_CONTENT_CODE) {
    return createElement(
      Typography.Text,
      { className: 'whitespace-pre-line' },
      asString(record.sampleNo),
    )
  }
  return asString(record.sampleNo)
}

export function resolveDetailedOperationActionValues(sampleNo: unknown) {
  const selected = resolveOptionValues(
    sampleNo,
    DETAILED_OPERATION_ACTION_VALUES,
  )
  return selected.length > 0 ? selected : DETAILED_OPERATION_ACTION_VALUES
}

export function resolveHideAuditedStatusValues(sampleNo: unknown) {
  const selected = resolveOptionValues(sampleNo, HIDE_AUDITED_STATUS_VALUES)
  return selected.length > 0 ? selected : ['已审核']
}

function resolveOptionValues(sampleNo: unknown, allowedValues: string[]) {
  const allowed = new Set(allowedValues)
  return asString(sampleNo)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => allowed.has(item))
}

export function resolveDefaultTaxRateValue(rows: ModuleRecord[] | undefined) {
  const matched = rows?.find(isDefaultTaxRateSetting)
  const value = Number(matched?.sampleNo || 0)
  return Number.isFinite(value) && value > 0 ? value : 0
}
