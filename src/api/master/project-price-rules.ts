import { z } from 'zod'
import { apiGet, apiPut } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'

/** 价格规定方向: ADD加价/SUBTRACT减价。 */
export type ProjectPriceRuleMode = 'ADD' | 'SUBTRACT'

export type ProjectPriceRule = {
  id: EntityId
  name: string
  mode: ProjectPriceRuleMode
  amount: number
  remark?: string
  sortOrder: number
}

export type ProjectPriceRulePayload = {
  id?: EntityId
  name: string
  mode: ProjectPriceRuleMode
  amount: number
  remark?: string
}

const priceRuleSchema = z.looseObject({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  mode: z.string(),
  amount: z.union([z.string(), z.number()]),
  remark: z.string().nullable().optional(),
  sortOrder: z.union([z.string(), z.number()]).nullable().optional(),
})

const priceRuleListSchema = z.array(priceRuleSchema)

function normalizeRule(
  raw: z.infer<typeof priceRuleSchema>,
  index: number,
): ProjectPriceRule {
  const amount = Number(raw.amount)
  const sortOrder = Number(raw.sortOrder)
  return {
    id: parseEntityId(raw.id, `priceRules[${index}].id`),
    name: raw.name,
    mode: raw.mode === 'SUBTRACT' ? 'SUBTRACT' : 'ADD',
    amount: Number.isFinite(amount) ? amount : 0,
    ...(raw.remark ? { remark: raw.remark } : {}),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : index,
  }
}

/** 查询项目价格规定。 */
export async function fetchProjectPriceRules(
  projectId: EntityId,
  signal?: AbortSignal,
): Promise<ProjectPriceRule[]> {
  const rows = await apiGet(
    ENDPOINTS.PROJECT_PRICE_RULES(parseEntityId(projectId, 'projectId')),
    priceRuleListSchema,
    signal ? { signal } : {},
  )
  return rows.map(normalizeRule)
}

/** 整体替换项目价格规定(新增/更新/软删/重排)。 */
export async function saveProjectPriceRules(
  projectId: EntityId,
  rules: ProjectPriceRulePayload[],
): Promise<ProjectPriceRule[]> {
  const payload = rules.map((rule) => ({
    ...(rule.id ? { id: rule.id } : {}),
    name: rule.name,
    mode: rule.mode,
    amount: rule.amount,
    ...(rule.remark ? { remark: rule.remark } : {}),
  }))
  const rows = await apiPut(
    ENDPOINTS.PROJECT_PRICE_RULES(parseEntityId(projectId, 'projectId')),
    priceRuleListSchema,
    payload,
    withIdempotencyKey(),
  )
  return rows.map(normalizeRule)
}
