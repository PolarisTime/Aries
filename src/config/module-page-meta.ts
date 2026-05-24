import { appPageDefinitions } from '@/config/page-registry'
import { asString } from '@/utils/type-narrowing'

export interface ModulePageMeta {
  key: string
  title: string
  primaryNoKey?: string
}

const primaryNoKeyMap: Record<string, string> = {
  'purchase-order': 'orderNo',
  'purchase-inbound': 'inboundNo',
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
  'invoice-receipt': 'receiveNo',
  'invoice-issue': 'issueNo',
  material: 'materialCode',
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

export function getModulePageMeta(moduleKey: string) {
  return modulePageMetaMap[moduleKey]
}
