import { asString } from '@/utils/type-narrowing'

export interface DocumentReference {
  no: string
  id?: string
  moduleKey?: string
  counterpartyName?: string
  amount?: number | string
  status?: string
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

/**
 * 单据引用显示的**唯一文本出口**（全系统只此一处）。
 *
 * <p>列表主表格、详情弹层、内联详情、明细行、对账单分组头、看板待办、财务台账、
 * 打印中心、编辑器只读列与选单器列一律调用本函数取展示文本；任何位置都不得再就近
 * 拼接一遍单号，否则同一行单号会在不同出口出现不同的间隔/去重口径。归一化统一走
 * `normalizeDocumentReferences`（兼容逗号文本、单号数组、后端对象数组、
 * `{documentNo, id}` 形态），多个单号按出现顺序用 `, ` 连接。</p>
 *
 * <p>空值（null/undefined/空串/空数组）返回空串：回退成 `-` 还是留空由调用方按场景
 * 决定（表格单元格回退 `-`，行内摘要留空）。</p>
 */
export function formatDocumentReferenceText(value: unknown): string {
  return normalizeDocumentReferences(value)
    .map((reference) => reference.no)
    .join(', ')
}

export function isDocumentReferenceField(fieldKey: string): boolean {
  return DOCUMENT_REFERENCE_FIELD_KEYS.has(fieldKey)
}

/** 列表主单号与跨单据关联号使用同一套纯文本口径，仅判断该字段是否属于单据引用列。 */
export function isListDocumentReferenceField(
  fieldKey: string,
  primaryNoKey?: string,
): boolean {
  return isDocumentReferenceField(fieldKey) && fieldKey !== primaryNoKey
}
