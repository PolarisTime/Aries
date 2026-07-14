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
  'sales-order': 'orderNo',
  'sales-outbound': 'outboundNo',
  'freight-bill': 'billNo',
  'supplier-statement': 'statementNo',
  'customer-statement': 'statementNo',
  'freight-statement': 'statementNo',
  receipt: 'receiptNo',
  payment: 'paymentNo',
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
