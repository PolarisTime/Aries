import type { SettlementCompanyOption } from '@/api/company-settings'

export const commonFields = [
  'billNo',
  'orderNo',
  'outboundNo',
  'statementNo',
  'customerName',
  'supplierName',
  'carrierName',
  'projectName',
  'projectAddress',
  'vehiclePlate',
  'deliveryDate',
  'outboundDate',
  'orderDate',
  'inboundDate',
  'billTime',
  'startDate',
  'endDate',
  'totalQuantity',
  'totalWeight',
  'totalAmount',
  'totalFreight',
  'remark',
]

export const detailFields = [
  'index',
  'sourceNo',
  'billTime',
  'category',
  'brand',
  'materialName',
  'material',
  'spec',
  'length',
  'quantity',
  'pieceWeightTon',
  'weightTon',
  'unitPrice',
  'amount',
  'warehouseName',
  'batchNo',
  'remark',
]

export const layoutFields = [
  'printDate',
  'printTime',
  'dateYear',
  'dateMonth',
  'dateDay',
  'rowTop',
  'sumTop',
  'sumTop2',
  'emptyRowTop',
  'hasEmptyRows',
  'isSeparator',
  'groupName',
  'needsNewPage',
  'needsSeparator',
  'footerTop',
  'footerLineTop',
  'footerDateTop',
]

export function defaultEngineForTemplateType(templateType: string) {
  if (templateType === 'COORD') return 'LODOP'
  if (templateType === 'PDF_FORM') return 'PDF_FORM'
  return 'LODOP'
}

export function findSettlementCompanyOption(
  options: SettlementCompanyOption[],
  value: unknown,
) {
  const normalizedValue = value == null ? '' : String(value).trim()
  if (!normalizedValue) return undefined
  return (
    options.find((option) => String(option.value).trim() === normalizedValue) ??
    (typeof value === 'number'
      ? options.find((option) => Number(option.value) === value)
      : undefined)
  )
}
