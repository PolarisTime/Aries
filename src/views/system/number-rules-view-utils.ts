import i18next from 'i18next'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export type NumberRuleEditorKind = 'number-rule' | 'upload-rule'

export const DATE_RULE_OPTIONS = [
  { label: i18next.t('system.numberRulesUtils.dateRuleYear'), value: 'yyyy' },
  { label: i18next.t('system.numberRulesUtils.dateRuleMonth'), value: 'yyyyMM' },
  { label: i18next.t('system.numberRulesUtils.dateRuleNone'), value: 'NONE' },
]

export const RESET_RULE_OPTIONS = [
  { label: i18next.t('system.numberRulesUtils.resetRuleYearly'), value: 'YEARLY' },
  { label: i18next.t('system.numberRulesUtils.resetRuleMonthly'), value: 'MONTHLY' },
  { label: i18next.t('system.numberRulesUtils.resetRuleNever'), value: 'NEVER' },
]

export const NUMBER_RULE_STATUS_OPTIONS = [
  { label: i18next.t('system.numberRulesUtils.statusNormal'), value: '正常' },
  { label: i18next.t('system.numberRulesUtils.statusDisabled'), value: '禁用' },
]

export function isUploadRule(record: ModuleRecord) {
  return asString(record.ruleType) === 'UPLOAD_RULE'
}

export function isSystemSwitch(record: ModuleRecord) {
  if (isUploadRule(record)) return false
  const settingCode = asString(record.settingCode)
  return settingCode.startsWith('UI_') || settingCode.startsWith('SYS_')
}

export function isNumberRule(record: ModuleRecord) {
  return !isUploadRule(record) && !isSystemSwitch(record)
}

export function matchesNumberRuleKeyword(
  record: ModuleRecord,
  searchKeyword: string,
) {
  if (!searchKeyword.trim()) return true
  const normalized = searchKeyword.trim().toLowerCase()
  return [
    record.settingCode,
    record.settingName,
    record.billName,
    record.prefix,
    record.sampleNo,
    record.remark,
    record.moduleKey,
  ].some((item) => asString(item).toLowerCase().includes(normalized))
}

export function formatDateRuleLabel(value?: string) {
  if (value === 'yyyy') return i18next.t('system.numberRulesUtils.dateRuleYear')
  if (value === 'yyyyMM') return i18next.t('system.numberRulesUtils.dateRuleMonth')
  if (value === 'NONE') return i18next.t('system.numberRulesUtils.dateRuleNone')
  return value || '--'
}

export function formatResetRuleLabel(value?: string) {
  if (value === 'YEARLY') return i18next.t('system.numberRulesUtils.resetRuleYearly')
  if (value === 'MONTHLY') return i18next.t('system.numberRulesUtils.resetRuleMonthly')
  if (value === 'NEVER') return i18next.t('system.numberRulesUtils.resetRuleNever')
  return value || '--'
}

export function formatNumberRuleStatusText(value?: string) {
  if (value === '正常') return i18next.t('system.numberRulesUtils.statusNormal')
  if (value === '禁用') return i18next.t('system.numberRulesUtils.statusDisabled')
  return value || '--'
}

export function formatNumberRuleStatusColor(value?: string) {
  if (value === '正常') return 'green'
  if (value === '禁用') return 'red'
  return 'default'
}

export function buildRuleSampleNo(
  prefix: string,
  dateRule: string,
  serialLength: number,
) {
  let result = prefix || ''
  if (dateRule === 'yyyy') result += '2026'
  else if (dateRule === 'yyyyMM') result += '202601'
  result += String(1).padStart(serialLength || 6, '0')
  return result
}

export function buildUploadRulePreview(pattern: string) {
  if (!pattern) return ''
  return pattern
    .replaceAll('{yyyy}', '2026')
    .replaceAll('{年月日}', '20260101')
    .replaceAll('{yyyyMMdd}', '20260101')
    .replaceAll('{HHmmss}', '120000')
    .replaceAll('{年月日时分秒}', '20260101120000')
    .replaceAll('{yyyyMMddHHmmss}', '20260101120000')
    .replaceAll('{timestamp}', String(Date.now()))
    .replaceAll('{random8}', 'abcd1234')
    .replaceAll(
      '{originName}',
      i18next.t('system.numberRulesUtils.originalFileName'),
    )
    .replaceAll('{ext}', '.pdf')
}
