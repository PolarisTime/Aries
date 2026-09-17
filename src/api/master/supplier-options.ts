import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

export type SupplierOption = {
  id: EntityId
  supplierCode: string
  supplierName: string
  /** 简称: 主数据维护, 用于下拉/单据等空间受限展示 */
  shortName?: string
  /** 经营品牌: 商品品牌名称列表, 用于报单比价按品牌过滤现货货源 */
  brands?: string[]
  value: EntityId
  label: string
}

type RawSupplierOption = {
  id?: unknown
  supplierCode?: unknown
  supplierName?: unknown
  shortName?: unknown
  brands?: unknown
  value?: unknown
  label?: unknown
}

const rawSupplierOptionSchema = z.object({
  id: z.string(),
  supplierCode: z.string(),
  supplierName: z.string(),
  shortName: z.string().nullable().optional(),
  brands: z.array(z.string()).nullable().optional(),
  value: z.string(),
  label: z.string(),
})

/** 空间受限场景展示名: 优先简称, 否则全称。 */
export function supplierDisplayName(option: SupplierOption): string {
  return option.shortName || option.supplierName
}

function buildSupplierLabel(id: EntityId, supplierName: string): string {
  return supplierName || `#${id}`
}

export function normalizeSupplierOptions(
  options: RawSupplierOption[],
): SupplierOption[] {
  return options.map((option, index) => {
    const id = parseEntityId(option.id, `suppliers[${index}].id`)
    const supplierCode = asString(option.supplierCode).trim()
    const rawValue = asString(option.value).trim()
    const sourceLabel = asString(option.label).trim()
    const supplierName =
      asString(option.supplierName).trim() ||
      (rawValue && rawValue !== id ? rawValue : '') ||
      sourceLabel
    const shortName = asString(option.shortName).trim()
    const brands = Array.isArray(option.brands)
      ? option.brands.flatMap((brand) => {
          const value = asString(brand).trim()
          return value ? [value] : []
        })
      : []

    return {
      id,
      supplierCode,
      supplierName,
      ...(shortName ? { shortName } : {}),
      brands,
      value: id,
      label: buildSupplierLabel(id, supplierName),
    }
  })
}

export async function fetchSupplierOptions(): Promise<SupplierOption[]> {
  const data = await apiGet(
    ENDPOINTS.SUPPLIERS_OPTIONS,
    z.array(rawSupplierOptionSchema),
  )
  return normalizeSupplierOptions(data)
}
