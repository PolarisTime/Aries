import {
  type CustomerOption,
  fetchCustomerOptions,
} from '@/api/master/customer-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/queries/query-cached-options'
import type { EntityId } from '@/types/entity-id'
import { parseOptionalEntityId } from '@/types/entity-id'

const customerOptions = createQueryCachedOptions<CustomerOption>({
  queryKey: QUERY_KEYS.masterOptions.customer,
  fetch: fetchCustomerOptions,
})

export const getCustomerOptions = customerOptions.get
export const reloadCustomerOptions = customerOptions.reload

export function findCustomerOption(
  customerId: unknown,
): CustomerOption | undefined {
  let normalizedId: EntityId | undefined
  try {
    normalizedId = parseOptionalEntityId(customerId, 'customerId')
  } catch {
    return undefined
  }
  if (!normalizedId) {
    return undefined
  }
  return customerOptions.get().find((row) => row.id === normalizedId)
}
