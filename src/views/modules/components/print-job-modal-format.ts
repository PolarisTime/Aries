import { getCustomerProjectOptions } from '@/module-system/core/module-option-resolvers'
import type { PrintTemplateRecord } from '@/shared/schemas'
import type { ModuleRecord } from '@/types/module-page'
import {
  formatAmount as formatAmountValue,
  formatDate,
} from '@/utils/formatters'
import { formatDecimal, sumValues } from '@/utils/money'
import type {
  PrintItemFieldKey,
  PrintItemFieldSpec,
} from '@/utils/print-module-config'
import { formatProjectDisplayName } from '@/utils/project-display'

const SUMMARY_FIELDS = [
  'billNo',
  'orderNo',
  'outboundNo',
  'inboundNo',
  'statementNo',
  'contractNo',
  'receiptNo',
  'paymentNo',
]

const COUNTERPARTY_FIELDS = ['customerName', 'supplierName', 'carrierName']

const PROJECT_ABBR_FIELDS = [
  'projectNameAbbr',
  'projectAbbr',
  'projectShortName',
  'projectShort',
]
const PROJECT_NAME_FIELDS = ['projectName']

function firstText(record: ModuleRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (value != null && String(value).trim()) {
      return String(value)
    }
  }
  return ''
}

export function recordOrderNo(record?: ModuleRecord) {
  return record ? firstText(record, SUMMARY_FIELDS) : ''
}

export function recordCounterparty(
  record?: ModuleRecord,
  fields: string[] = COUNTERPARTY_FIELDS,
) {
  return record ? firstText(record, fields) : ''
}

/** 记录所属项目 id; 无项目返回空串(此时不记忆打印模板偏好)。 */
export function recordProjectId(record?: ModuleRecord) {
  return record ? firstText(record, ['projectId']) : ''
}

function lookupProjectNameAbbr(record: ModuleRecord) {
  const projectName = firstText(record, PROJECT_NAME_FIELDS)
  if (!projectName) return ''

  const projectId = firstText(record, ['projectId'])
  const options = getCustomerProjectOptions({ customerId: record.customerId })
  const matched = options.find(
    (option) =>
      (projectId && String(option.id).trim() === projectId) ||
      String(option.projectName || option.value).trim() === projectName,
  )
  const value = matched?.projectNameAbbr
  return value == null ? '' : String(value).trim()
}

export function projectSummary(record?: ModuleRecord) {
  if (!record) return ''
  const projectNameAbbr =
    firstText(record, PROJECT_ABBR_FIELDS) || lookupProjectNameAbbr(record)
  // 「简称（全称）」的唯一格式出口: 四条业务列表的项目列与本组件共用同一实现。
  return formatProjectDisplayName(
    projectNameAbbr,
    firstText(record, PROJECT_NAME_FIELDS),
  )
}

export function isPdfTemplate(template?: PrintTemplateRecord) {
  return template?.templateType === 'PDF_FORM'
}

export function templateTypeLabel(
  template: PrintTemplateRecord | undefined,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  return isPdfTemplate(template)
    ? t('system.printTemplateEditor.templateTypePdfForm')
    : t('system.printTemplateEditor.templateTypeCoord')
}

export function fieldText(value: unknown) {
  const text = value == null ? '' : String(value).trim()
  return text || '-'
}

export function numericTotal(values: unknown[]) {
  // 合计走十进制精确求和（`utils/money.sumValues`）：浮点累加会让「合计重量」
  // 在多行明细时与单据差 0.001 吨，打印件与屏幕对不上账。
  const total = sumValues(values)
  return total > 0 ? total : null
}

/** 金额合计（明细逐行金额相加，舍到分）；无非零金额时返回 null。 */
export function numericAmountTotal(values: unknown[]) {
  const total = sumValues(values, 2)
  return total > 0 ? total : null
}

/**
 * 汇总条「日期」行的取值：single 取第一个非空字段，range 拼「起 ~ 止」。
 *
 * <p>标签与字段都来自模块布局（`print-job-layout`），不再在这里按 moduleKey 判断。</p>
 */
export function summaryDateText(
  record: ModuleRecord | undefined,
  date: {
    fields: [string] | [string, string]
    mode: 'single' | 'range'
  } | null,
) {
  if (!record || !date) return '-'
  if (date.mode === 'range') {
    const [startField, endField] = date.fields
    const start = formatDate(record[startField] as string | undefined, '')
    const end = formatDate(record[endField] as string | undefined, '')
    if (start && end) return `${start} ~ ${end}`
    return start || end || '-'
  }
  const [field] = date.fields
  return formatDate(record[field] as string | undefined, '-')
}

function toNumberOrNull(value: unknown) {
  if (value == null || String(value).trim() === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function formattedTotal(value: number | null, fractionDigits = 3) {
  if (value == null) return '-'
  // 舍入与格式化都走十进制出口：`toFixed` 按 IEEE-754 真实值舍入，
  // 9.995 会被舍成 9.99，而金额/吨位口径是 HALF_UP。
  const fixed = formatDecimal(value, fractionDigits)
  // 整数展示（如合计件数）不做尾零截断，避免 100 被截成 "1"。
  if (fractionDigits === 0) return fixed
  return fixed.replace(/\.?0+$/, '')
}

/**
 * 金额、单价展示：委托给全站唯一出口 {@link formatAmount}。
 *
 * <p>这里原本是 `numeric.toFixed(2)`，不带千分位，与表格列（`utils/formatters.ts`
 * 的 `formatAmount`）渲染出两种样子 —— 同一笔金额在打印弹层是 `1234567.00`、
 * 在列表是 `1,234,567.00`。打印件与屏幕对不上账，用户会怀疑数据错。
 * 现在只保留"空值 → `-`"这层打印语义，数字格式统一由全局出口决定。</p>
 */
export function formatAmount(value: unknown) {
  const numeric = toNumberOrNull(value)
  return numeric == null ? '-' : formatAmountValue(numeric)
}

/** 按字段语义格式化明细单元格：件数取整、重量三位去尾零、金额两位小数。 */
export function printItemCellText(field: PrintItemFieldKey, value?: string) {
  if (field === 'quantity') return formattedTotal(toNumberOrNull(value), 0)
  if (field === 'pieceWeightTon' || field === 'weightTon') {
    return formattedTotal(toNumberOrNull(value), 3)
  }
  if (field === 'unitPrice' || field === 'amount') return formatAmount(value)
  return fieldText(value)
}

export type { PrintItemFieldSpec }
