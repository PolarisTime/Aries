import { asString } from '@/utils/type-narrowing'

export interface DocumentReference {
  no: string
  id?: string
  moduleKey?: string
  counterpartyName?: string
  amount?: number | string
  status?: string
}

export interface DocumentReferenceSummaryOptions {
  documentLabel?: string
}

const DOCUMENT_NO_KEYS = [
  'no',
  'documentNo',
  'docNo',
  'orderNo',
  'purchaseOrderNo',
  'purchaseInboundNo',
  'inboundNo',
  'salesOrderNo',
  'outboundNo',
  'billNo',
  'statementNo',
  'receiptNo',
  'paymentNo',
] as const

const COUNTERPARTY_KEYS = [
  'counterpartyName',
  'customerName',
  'supplierName',
  'carrierName',
] as const

const AMOUNT_KEYS = [
  'amount',
  'totalAmount',
  'closingAmount',
  'totalFreight',
] as const

const MODULE_BY_FIELD: Readonly<Record<string, string>> = {
  purchaseOrderNo: 'purchase-order',
  purchaseInboundNo: 'purchase-inbound',
  inboundNo: 'purchase-inbound',
  salesOrderNo: 'sales-order',
  outboundNo: 'sales-outbound',
  sourceOrderNos: 'sales-order',
  sourceBillNos: 'freight-bill',
  sourceNo: 'freight-bill',
}

export const DOCUMENT_REFERENCE_FIELD_KEYS = new Set([
  'docNo',
  'documentNo',
  'relatedDocumentNo',
  'orderNo',
  'purchaseOrderNo',
  'purchaseInboundNo',
  'inboundNo',
  'salesOrderNo',
  'outboundNo',
  'billNo',
  'statementNo',
  'receiptNo',
  'paymentNo',
  'sourceNo',
  'sourceOrderNos',
  'sourceBillNos',
])

const SOURCE_MODULE_BY_CONTEXT: Readonly<Record<string, string>> = {
  'purchase-inbound': 'purchase-order',
  'sales-outbound': 'sales-order',
  'freight-bill': 'sales-order',
  'customer-statement': 'sales-order',
  'freight-statement': 'freight-bill',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function firstText(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = asString(record[key]).trim()
    if (value) {
      return value
    }
  }
  return ''
}

function firstValue(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return undefined
}

function parseReference(value: unknown): DocumentReference[] {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
      .toString()
      .split(/[，,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((no) => ({ no }))
  }

  if (!isRecord(value)) {
    return []
  }

  const no = firstText(value, DOCUMENT_NO_KEYS)
  if (!no) {
    return []
  }

  const id = firstText(value, ['id', 'documentId'])
  const moduleKey = firstText(value, ['moduleKey', 'documentModule'])
  const counterpartyName = firstText(value, COUNTERPARTY_KEYS)
  const amount = firstValue(value, AMOUNT_KEYS)
  const status = firstText(value, ['status', 'auditStatus'])

  return [
    {
      no,
      ...(id ? { id } : {}),
      ...(moduleKey ? { moduleKey } : {}),
      ...(counterpartyName ? { counterpartyName } : {}),
      ...(typeof amount === 'number' || typeof amount === 'string'
        ? { amount }
        : {}),
      ...(status ? { status } : {}),
    },
  ]
}

/**
 * 统一兼容历史逗号文本、单号数组和后端对象数组。
 * 同一单号只保留首次出现的顺序，后续对象只补全缺失摘要字段。
 */
export function normalizeDocumentReferences(
  value: unknown,
): DocumentReference[] {
  const source = Array.isArray(value) ? value : [value]
  const references: DocumentReference[] = []
  const indexByNo = new Map<string, number>()

  for (const item of source) {
    for (const reference of parseReference(item)) {
      const existingIndex = indexByNo.get(reference.no)
      if (existingIndex === undefined) {
        indexByNo.set(reference.no, references.length)
        references.push(reference)
        continue
      }
      const existing = references[existingIndex]
      references[existingIndex] = {
        ...existing,
        ...(existing.id ? {} : reference.id ? { id: reference.id } : {}),
        ...(existing.moduleKey
          ? {}
          : reference.moduleKey
            ? { moduleKey: reference.moduleKey }
            : {}),
        ...(existing.counterpartyName
          ? {}
          : reference.counterpartyName
            ? { counterpartyName: reference.counterpartyName }
            : {}),
        ...(existing.amount === undefined && reference.amount !== undefined
          ? { amount: reference.amount }
          : {}),
        ...(existing.status
          ? {}
          : reference.status
            ? { status: reference.status }
            : {}),
      }
    }
  }

  return references
}

export function buildDocumentReferenceSummary(
  references: readonly DocumentReference[],
  options: DocumentReferenceSummaryOptions = {},
): string {
  if (references.length === 0) {
    return '-'
  }
  if (references.length === 1) {
    return references[0].no
  }
  const label = options.documentLabel || '单据'
  return `已关联 ${references.length} 笔${label}`
}

export function resolveDocumentReferenceModule(
  fieldKey: string,
  contextModuleKey?: string,
): string | undefined {
  if (fieldKey === 'sourceNo' && contextModuleKey) {
    return (
      SOURCE_MODULE_BY_CONTEXT[contextModuleKey] || MODULE_BY_FIELD[fieldKey]
    )
  }
  return MODULE_BY_FIELD[fieldKey]
}

export function isDocumentReferenceField(fieldKey: string): boolean {
  return DOCUMENT_REFERENCE_FIELD_KEYS.has(fieldKey)
}

/** 列表主单号保持紧凑文本展示，跨单据关联号继续使用下钻 Popover。 */
export function isListDocumentReferenceField(
  fieldKey: string,
  primaryNoKey?: string,
): boolean {
  return isDocumentReferenceField(fieldKey) && fieldKey !== primaryNoKey
}

export function getDocumentReferenceSummary(value: unknown): {
  counterpartyName?: string
  amount?: number | string
  status?: string
} {
  if (!isRecord(value)) {
    return {}
  }
  const amount = firstValue(value, AMOUNT_KEYS)
  return {
    ...(firstText(value, COUNTERPARTY_KEYS)
      ? { counterpartyName: firstText(value, COUNTERPARTY_KEYS) }
      : {}),
    ...(typeof amount === 'number' || typeof amount === 'string'
      ? { amount }
      : {}),
    ...(firstText(value, ['status', 'auditStatus'])
      ? { status: firstText(value, ['status', 'auditStatus']) }
      : {}),
  }
}
