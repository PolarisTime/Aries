import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
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

const rawCustomerOptionSchema = z.object({
  id: z.string(),
  value: z.string(),
  label: z.string(),
  customerCode: z.string(),
  customerName: z.string(),
  defaultSettlementCompanyId: z.string().nullable().optional(),
  defaultSettlementCompanyName: z.string().nullable().optional(),
})

function normalizeText(value: unknown): string {
  return asString(value).trim()
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
      label: customerName || normalizeText(row.label) || `#${id}`,
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

/** 同名客户不得合并，选项顺序由服务端业务编码排序决定。 */
export async function fetchCustomerOptions(): Promise<CustomerOption[]> {
  const data = await apiGet(
    ENDPOINTS.CUSTOMERS_OPTIONS,
    z.array(rawCustomerOptionSchema),
  )
  return normalizeCustomerRows(data)
}
