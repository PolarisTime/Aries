import { z } from 'zod'
import { apiGet, apiPut } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import { type EntityId, parseEntityId } from '@/types/entity-id'
import { normalizeVersion, withConcurrencyHeaders } from './quote-concurrency'

/** 规则查询键：按 供应商 + 品牌 缓存。 */
export const basePriceRulesQueryKey = (
  supplierId: EntityId | undefined,
  brandName: string | undefined,
) => ['supplier-base-price-rules', supplierId ?? '', brandName ?? ''] as const

/** 规格引用：材质 + 规格（直径）+ 定尺。 */
export type BasePriceRef = {
  material: string
  spec: number
  length: string
}

/** 规则项：某规格相对基价的加减（可为负）。 */
export type BasePriceRuleItem = BasePriceRef & {
  delta: number
}

export type SupplierBasePriceRules = {
  supplierId: EntityId
  brandName: string
  /** 哪个规格是基价；null = 还没配置。 */
  base: BasePriceRef | null
  items: BasePriceRuleItem[]
  /** 服务端版本号（X-Resource-Version），保存时作为前置条件。 */
  version: string
}

const numberLike = z.union([z.number(), z.string()])

const refSchema = z.looseObject({
  material: z.string().nullish(),
  spec: numberLike.nullish(),
  length: z.string().nullish(),
})

const rulesSchema = z.looseObject({
  supplierId: z.unknown(),
  brandName: z.string().nullish(),
  base: refSchema.nullish(),
  items: z
    .array(
      z.looseObject({
        material: z.string().nullish(),
        spec: numberLike.nullish(),
        length: z.string().nullish(),
        delta: numberLike.nullish(),
      }),
    )
    .nullish(),
  version: numberLike.nullish(),
})

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeRef = (raw: z.infer<typeof refSchema>): BasePriceRef | null => {
  const spec = toNumber(raw.spec)
  if (spec === null || !Number.isInteger(spec) || spec <= 0) return null
  return {
    material: raw.material ?? '',
    spec,
    length: raw.length ?? '',
  }
}

function normalizeRules(
  raw: z.infer<typeof rulesSchema>,
  supplierId: EntityId,
  brandName: string,
): SupplierBasePriceRules {
  return {
    supplierId: raw.supplierId
      ? parseEntityId(raw.supplierId, 'rules.supplierId')
      : supplierId,
    brandName: raw.brandName ?? brandName,
    base: raw.base ? normalizeRef(raw.base) : null,
    items: (raw.items ?? []).flatMap((item) => {
      const ref = normalizeRef(item)
      if (!ref) return []
      return [{ ...ref, delta: toNumber(item.delta) ?? 0 }]
    }),
    version: normalizeVersion(raw.version) ?? '0',
  }
}

/** 读取「供应商 + 品牌」的基价加价规则；未配置时 base=null、items 为空。 */
export async function fetchSupplierBasePriceRules(
  supplierId: EntityId,
  brandName: string,
  signal?: AbortSignal,
): Promise<SupplierBasePriceRules> {
  const normalized = parseEntityId(supplierId, 'supplierId')
  const response = await apiGet(
    ENDPOINTS.SUPPLIER_BASE_PRICE_RULES,
    rulesSchema,
    {
      params: { supplierId: normalized, brandName },
      ...(signal ? { signal } : {}),
    },
  )
  return normalizeRules(response, normalized, brandName)
}

export type SupplierBasePriceRulesPayload = {
  supplierId: EntityId
  brandName: string
  base: BasePriceRef | null
  items: BasePriceRuleItem[]
}

/**
 * 整体替换「供应商 + 品牌」的基价加价规则。
 *
 * <p>并发用仓库统一约定：`X-Resource-Version` 头做前置条件（版本不符 412），并带幂等键。</p>
 */
export async function saveSupplierBasePriceRules(
  payload: SupplierBasePriceRulesPayload,
  expectedVersion: string | undefined,
): Promise<SupplierBasePriceRules> {
  const normalized = parseEntityId(payload.supplierId, 'supplierId')
  const response = await apiPut(
    ENDPOINTS.SUPPLIER_BASE_PRICE_RULES,
    rulesSchema,
    {
      supplierId: normalized,
      brandName: payload.brandName,
      base: payload.base,
      items: payload.items,
    },
    withIdempotencyKey(withConcurrencyHeaders(expectedVersion)),
  )
  return normalizeRules(response, normalized, payload.brandName)
}
