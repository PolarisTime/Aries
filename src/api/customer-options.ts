import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/lib/query-cached-options'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

export type CustomerOption = {
  id: EntityId
  value: EntityId
  label: string
  customerCode: string
  customerName: string
  defaultSettlementCompanyId?: EntityId
  defaultSettlementCompanyName?: string
}

type RawCustomerOption = {
  id?: unknown
  value?: unknown
  label?: unknown
  customerCode?: unknown
  customerName?: unknown
  defaultSettlementCompanyId?: unknown
  defaultSettlementCompanyName?: unknown
}

export function normalizeText(value: unknown): string {
  return asString(value).trim()
}

function customerLabel(
  id: EntityId,
  customerCode: string,
  customerName: string,
): string {
  if (customerCode && customerName) {
    return `${customerCode} / ${customerName}`
  }
  return customerName ? `${customerName} / #${id}` : `#${id}`
}

export function normalizeCustomerRows(
  rows: RawCustomerOption[],
): CustomerOption[] {
  return rows.map((row, index) => {
    const id = parseEntityId(row.id, `customers[${index}].customer.id`)
    const customerCode = normalizeText(row.customerCode)
    const customerName = normalizeText(row.customerName || row.value)
    const defaultSettlementCompanyId = parseOptionalEntityId(
      row.defaultSettlementCompanyId,
      `customers[${index}].defaultSettlementCompanyId`,
    )

    return {
      id,
      value: id,
      label: customerLabel(id, customerCode, customerName),
      customerCode,
      customerName,
      ...(defaultSettlementCompanyId ? { defaultSettlementCompanyId } : {}),
      ...(normalizeText(row.defaultSettlementCompanyName)
        ? {
            defaultSettlementCompanyName: normalizeText(
              row.defaultSettlementCompanyName,
            ),
          }
        : {}),
    }
  })
}

const cached = createQueryCachedOptions<CustomerOption, RawCustomerOption>({
  endpoint: ENDPOINTS.CUSTOMERS_OPTIONS,
  queryKey: QUERY_KEYS.masterOptions.customer,
  normalizer: normalizeCustomerRows,
})

export const fetchCustomerOptions = cached.fetch
export const reloadCustomerOptions = cached.reload

/** 同名客户不得合并，选项顺序由服务端业务编码排序决定。 */
export function getCustomerOptions(): CustomerOption[] {
  return cached.get()
}

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
  return cached.get().find((row) => row.id === normalizedId)
}

/** @deprecated 使用 getCustomerOptions；保留导出以兼容既有插件。 */
export function uniqueCustomerNameOptions(
  rows: CustomerOption[],
): CustomerOption[] {
  return [...rows]
}

export { getCustomerProjectOptions } from './project-options'
