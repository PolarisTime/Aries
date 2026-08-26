import type { CustomerOption } from '@/api/master/customer-options'
import { asString } from '@/utils/type-narrowing'

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
