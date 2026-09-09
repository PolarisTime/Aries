import type { CustomerOption } from '@/api/master/customer-options'
import { getCustomerOptions } from '@/module-system/core/module-option-resolvers'
import { asString } from '@/utils/type-narrowing'

export function projectCustomerFieldOptions() {
  return getCustomerOptions().map((option) => ({
    label: option.customerName || option.label,
    value: option.id,
    customerCode: option.customerCode,
    customerName: option.customerName,
    settlementCompanyId: option.defaultSettlementCompanyId,
    settlementCompanyName: option.defaultSettlementCompanyName,
  }))
}

export function resolveProjectCustomerDisplay(
  record: Record<string, unknown>,
  customerOptions: readonly CustomerOption[],
): string {
  const customerId = asString(record.customerId).trim()
  const matchedCustomer = customerOptions.find(
    (option) => option.id === customerId,
  )
  const customerName = asString(
    matchedCustomer?.customerName ||
      matchedCustomer?.label ||
      record.customerName,
  ).trim()
  if (customerName) return customerName

  const customerCode = asString(record.customerCode).trim()
  return customerCode || '--'
}
