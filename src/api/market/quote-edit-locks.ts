import { z } from 'zod'
import { apiDeleteNoContent, apiGet, apiPost } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import { withConcurrencyHeaders } from './quote-concurrency'

const editLockSchema = z.looseObject({
  sheetId: z.unknown(),
  locked: z.boolean(),
  ownerId: z.union([z.number(), z.string()]).nullable().optional(),
  ownerName: z.string().nullable().optional(),
  acquiredAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  mine: z.boolean().nullable().optional(),
  ttlSeconds: z.union([z.number(), z.string()]).nullable().optional(),
})

export type QuoteSheetEditLock = {
  sheetId: EntityId
  locked: boolean
  ownerId?: EntityId
  ownerName?: string
  expiresAt?: string
  mine: boolean
  ttlSeconds: number
}

function normalizeEditLock(
  raw: z.infer<typeof editLockSchema>,
): QuoteSheetEditLock {
  const ownerId = parseOptionalEntityId(raw.ownerId, 'editLock.ownerId')
  return {
    sheetId: parseEntityId(raw.sheetId, 'editLock.sheetId'),
    locked: raw.locked,
    mine: Boolean(raw.mine),
    ttlSeconds: Number(raw.ttlSeconds ?? 120) || 120,
    ...(ownerId ? { ownerId } : {}),
    ...(raw.ownerName ? { ownerName: raw.ownerName } : {}),
    ...(raw.expiresAt ? { expiresAt: raw.expiresAt } : {}),
  }
}

/** 查询当前编辑锁(无锁返回 locked=false)。 */
export async function fetchQuoteSheetEditLock(
  id: EntityId,
  signal?: AbortSignal,
): Promise<QuoteSheetEditLock> {
  const response = await apiGet(
    ENDPOINTS.QUOTE_SHEET_EDIT_LOCK(id),
    editLockSchema,
    {
      ...(signal ? { signal } : {}),
      ...withConcurrencyHeaders(undefined),
    },
  )
  return normalizeEditLock(response)
}

/**
 * 签出/续约编辑锁。他人未过期时抛 409(由调用方降级处理)。
 * @param options.force 为 true 时强制接管未过期的他人锁(需二次确认)。
 */
export async function acquireQuoteSheetEditLock(
  id: EntityId,
  options?: { force?: boolean },
): Promise<QuoteSheetEditLock> {
  const response = await apiPost(
    ENDPOINTS.QUOTE_SHEET_EDIT_LOCK(id),
    editLockSchema,
    undefined,
    withConcurrencyHeaders(
      undefined,
      options?.force ? { params: { force: true } } : undefined,
    ),
  )
  return normalizeEditLock(response)
}

/** 释放编辑锁(幂等)。 */
export async function releaseQuoteSheetEditLock(id: EntityId): Promise<void> {
  await apiDeleteNoContent(
    ENDPOINTS.QUOTE_SHEET_EDIT_LOCK(id),
    withConcurrencyHeaders(undefined),
  )
}
