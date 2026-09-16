import { z } from 'zod'
import { apiGet, apiPut } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'
import { normalizeVersion, withConcurrencyHeaders } from './quote-concurrency'

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const brandSchema = z.looseObject({
  brandName: z.string(),
  freight: z.union([z.number(), z.string()]).nullable().optional(),
  categories: z.array(z.string()).nullable().optional(),
  sortOrder: z.union([z.number(), z.string()]).nullable().optional(),
})

const configSchema = z.looseObject({
  projectId: z.union([z.number(), z.string()]).nullable().optional(),
  lengthPremium: z.union([z.number(), z.string()]).nullable().optional(),
  hrb400eFallback: z.boolean().nullable().optional(),
  products: z.array(z.string()).nullable().optional(),
  designatedBrands: z.array(z.string()).nullable().optional(),
  remark: z.string().nullable().optional(),
  brands: z.array(brandSchema).nullable().optional(),
  version: z.union([z.number(), z.string()]).nullable().optional(),
})

export type QuoteProjectBrandRecord = {
  brandName: string
  freight: number
  categories: string[]
  sortOrder: number
}

export type QuoteProjectConfigRecord = {
  projectId: EntityId
  lengthPremium: number
  hrb400eFallback: boolean
  products: string[]
  designatedBrands: string[]
  remark?: string
  brands: QuoteProjectBrandRecord[]
  /** 服务端权威版本; 未保存过时为 '0'。 */
  version: string
}

export type QuoteProjectConfigPayload = {
  lengthPremium: number
  hrb400eFallback: boolean
  products: string[]
  designatedBrands: string[]
  remark?: string
  brands: QuoteProjectBrandRecord[]
}

function normalizeConfig(
  raw: z.infer<typeof configSchema>,
  projectId: EntityId,
): QuoteProjectConfigRecord {
  return {
    projectId: raw.projectId
      ? parseEntityId(raw.projectId, 'config.projectId')
      : projectId,
    lengthPremium: toNumber(raw.lengthPremium, 30),
    hrb400eFallback: Boolean(raw.hrb400eFallback),
    products: raw.products ?? [],
    designatedBrands: raw.designatedBrands ?? [],
    brands: (raw.brands ?? []).map((brand, index) => ({
      brandName: brand.brandName,
      freight: toNumber(brand.freight),
      categories: brand.categories ?? [],
      sortOrder: toNumber(brand.sortOrder, index),
    })),
    version: normalizeVersion(raw.version) ?? '0',
    ...(raw.remark ? { remark: raw.remark } : {}),
  }
}

/** 查询项目级比价配置(未配置返回后端默认空配置)。 */
export async function fetchQuoteProjectConfig(
  projectId: EntityId,
  signal?: AbortSignal,
): Promise<QuoteProjectConfigRecord> {
  const normalized = parseEntityId(projectId, 'projectId')
  const response = await apiGet(
    ENDPOINTS.QUOTE_PROJECT_CONFIG(normalized),
    configSchema,
    { ...(signal ? { signal } : {}) },
  )
  return normalizeConfig(response, normalized)
}

/** 保存项目级比价配置(整体替换, 幂等)。 */
export async function saveQuoteProjectConfig(
  projectId: EntityId,
  payload: QuoteProjectConfigPayload,
  expectedVersion?: string,
): Promise<QuoteProjectConfigRecord> {
  const normalized = parseEntityId(projectId, 'projectId')
  const response = await apiPut(
    ENDPOINTS.QUOTE_PROJECT_CONFIG(normalized),
    configSchema,
    payload,
    withConcurrencyHeaders(expectedVersion),
  )
  return normalizeConfig(response, normalized)
}
