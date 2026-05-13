import { asString } from '@/utils/type-narrowing'
import type { ModuleRecord } from '@/types/module-page'

export type NumberRuleEditorKind = 'number-rule' | 'upload-rule'

export const DATE_RULE_OPTIONS = [
  { label: '按年（yyyy）', value: 'yyyy' },
  { label: '按月（yyyyMM）', value: 'yyyyMM' },
  { label: '无日期', value: 'NONE' },
]

export const RESET_RULE_OPTIONS = [
  { label: '按年重置', value: 'YEARLY' },
  { label: '按月重置', value: 'MONTHLY' },
  { label: '永不重置', value: 'NEVER' },
]

export const NUMBER_RULE_STATUS_OPTIONS = [
  { label: '正常', value: '正常' },
  { label: '禁用', value: '禁用' },
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
  ].some((item) =>
    asString(item)
      .toLowerCase()
      .includes(normalized),
  )
}

export function formatDateRuleLabel(value?: string) {
  if (value === 'yyyy') return '按年（yyyy）'
  if (value === 'yyyyMM') return '按月（yyyyMM）'
  if (value === 'NONE') return '无日期'
  return value || '--'
}

export function formatResetRuleLabel(value?: string) {
  if (value === 'YEARLY') return '按年重置'
  if (value === 'MONTHLY') return '按月重置'
  if (value === 'NEVER') return '永不重置'
  return value || '--'
}

export function formatNumberRuleStatusText(value?: string) {
  if (value === '正常') return '正常'
  if (value === '禁用') return '禁用'
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
    .replace('{yyyy}', '2026')
    .replace('{yyyyMMdd}', '20260101')
    .replace('{HHmmss}', '120000')
    .replace('{yyyyMMddHHmmss}', '20260101120000')
    .replace('{timestamp}', String(Date.now()))
    .replace('{random8}', 'abcd1234')
    .replace('{originName}', '原始文件名')
    .replace('{ext}', '.pdf')
}
