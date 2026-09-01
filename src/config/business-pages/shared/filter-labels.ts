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
export const REFERENCE_STATUS_OPTIONS = [
  { label: i18next.t('modules.filter.referenced'), value: 'true' },
  { label: i18next.t('modules.filter.notReferenced'), value: 'false' },
]
