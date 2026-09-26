import { appPageDefinitions } from '@/config/page-registry'
import { asString } from '@/utils/type-narrowing'

export interface ModulePageMeta {
  key: string
  /** 模块标题的 i18n key；渲染期用 `t(titleKey)` 解析, 不在模块顶层翻译。 */
  titleKey: string
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
  'sales-return': 'returnNo',
  'freight-bill': 'billNo',
  'customer-statement': 'statementNo',
  'freight-statement': 'statementNo',
  receipt: 'receiptNo',
  payment: 'paymentNo',
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
            titleKey: entry.titleKey,
            primaryNoKey: primaryNoKeyMap[moduleKey],
          } satisfies ModulePageMeta,
        ],
      ]
    }),
  )
