import { getCustomerProjectOptions } from '@/module-system/core/module-option-resolvers'
import type { PrintTemplateRecord } from '@/shared/schemas'
import type { ModuleRecord } from '@/types/module-page'
import { formatAmount as formatAmountValue } from '@/utils/formatters'
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

export function recordCounterparty(record?: ModuleRecord) {
  return record ? firstText(record, COUNTERPARTY_FIELDS) : ''
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
  const total = values.reduce<number>((sum, value) => {
    const numericValue = toNumberOrNull(value)
    return numericValue == null ? sum : sum + numericValue
  }, 0)
  return total > 0 ? total : null
}

function toNumberOrNull(value: unknown) {
  if (value == null || String(value).trim() === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function formattedTotal(value: number | null, fractionDigits = 3) {
  if (value == null) return '-'
  const fixed = value.toFixed(fractionDigits)
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
