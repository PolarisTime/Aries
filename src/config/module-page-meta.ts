import { appPageDefinitions } from '@/config/page-registry'
import { asString } from '@/utils/type-narrowing'

export interface ModulePageMeta {
  key: string
  title: string
  primaryNoKey?: string
}

const primaryNoKeyMap: Record<string, string> = {
  material: 'materialCode',
  'material-categories': 'categoryCode',
  supplier: 'supplierCode',
  customer: 'customerCode',
  carrier: 'carrierCode',
  warehouse: 'warehouseCode',
  'purchase-order': 'orderNo',
  'purchase-inbound': 'inboundNo',
  'purchase-refund': 'refundNo',
  'sales-order': 'orderNo',
  'sales-outbound': 'outboundNo',
  'freight-bill': 'billNo',
  'purchase-contract': 'contractNo',
  'sales-contract': 'contractNo',
  'supplier-statement': 'statementNo',
  'customer-statement': 'statementNo',
  'freight-statement': 'statementNo',
  receipt: 'receiptNo',
  payment: 'paymentNo',
  'supplier-refund-receipt': 'refundReceiptNo',
  'invoice-receipt': 'receiveNo',
  'invoice-issue': 'issueNo',
  'ledger-adjustment': 'adjustmentNo',
  department: 'departmentCode',
}

export const modulePageMetaMap: Record<string, ModulePageMeta> =
  Object.fromEntries(
    appPageDefinitions.flatMap((entry) => {
      if (!entry.moduleKey) return []
      const moduleKey = asString(entry.moduleKey)
      return [
        [
          moduleKey,
          {
            key: moduleKey,
            title: entry.title,
            primaryNoKey: primaryNoKeyMap[moduleKey],
          } satisfies ModulePageMeta,
        ],
      ]
    }),
  )
