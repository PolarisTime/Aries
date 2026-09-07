import i18next from 'i18next'

export const BILL_STATUS_LABEL = i18next.t('modules.filter.billStatus')
export const AUDIT_STATUS_LABEL = i18next.t('modules.filter.auditStatus')
export const CUSTOMER_NAME_LABEL = i18next.t('modules.filter.customerName')
export const SUPPLIER_NAME_LABEL = i18next.t('modules.filter.supplierName')
export const CARRIER_NAME_LABEL = i18next.t('modules.filter.carrierName')
export const ORDER_NO_FILTER_LABEL = i18next.t('modules.filter.orderNo')
export const OUTBOUND_NO_FILTER_LABEL = i18next.t('modules.filter.outboundNo')
export const INBOUND_NO_FILTER_LABEL = i18next.t('modules.filter.inboundNo')
export const FREIGHT_NO_FILTER_LABEL = i18next.t('modules.filter.freightNo')
export const REFERENCE_STATUS_LABEL = i18next.t(
  'modules.filter.referenceStatus',
)
// 销售订单下游模块：物流单、销售出库。
export const SALES_ORDER_REFERENCE_OPTIONS = [
  {
    label: i18next.t('modules.filter.referencedByFreightBill'),
    value: 'freight-bill',
  },
  {
    label: i18next.t('modules.filter.referencedBySalesOutbound'),
    value: 'sales-outbound',
  },
  { label: i18next.t('modules.filter.notReferenced'), value: 'none' },
]
// 采购订单下游模块：销售订单、采购入库。
export const PURCHASE_ORDER_REFERENCE_OPTIONS = [
  {
    label: i18next.t('modules.filter.referencedBySalesOrder'),
    value: 'sales-order',
  },
  {
    label: i18next.t('modules.filter.referencedByPurchaseInbound'),
    value: 'purchase-inbound',
  },
  { label: i18next.t('modules.filter.notReferenced'), value: 'none' },
]
