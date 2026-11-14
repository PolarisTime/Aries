import { z } from 'zod'
import { apiGet, apiPut } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import type { UserColumnSettingsPayload } from '@/types/module-page'

const columnSizesSchema = z.record(
  z.string(),
  z.number().int().min(1).max(800).catch(120),
)

const columnSettingsPageSchema = z.object({
  orderedKeys: z.array(z.string()),
  hiddenKeys: z.array(z.string()),
  // 可选 + 值级兜底：兼容旧数据与单条坏值，避免 z.object strip 或整契约失败
  columnSizes: columnSizesSchema.optional(),
})

const userColumnSettingsResponseSchema = z.object({
  pages: z.record(z.string(), columnSettingsPageSchema),
})

export type UserColumnSettingsPage = z.output<typeof columnSettingsPageSchema>

export async function getUserColumnSettings() {
  return apiGet(ENDPOINTS.ACCOUNT_PREFERENCES, userColumnSettingsResponseSchema)
}

export async function saveUserColumnSettings(
  payload: UserColumnSettingsPayload,
) {
  return apiPut(
    ENDPOINTS.ACCOUNT_PREFERENCES,
    userColumnSettingsResponseSchema,
    payload,
    withIdempotencyKey(),
  )
}

/**
 * 账户设置 v2 契约（`GET/PUT /api/v2/account/settings`，见 docs/client-state-sync.md §4.2）。
 *
 * <p>结构升级自 v1（只有 `pages`）：`sections` 承载 ui / layoutTabs / supplierQuote 三个分片，
 * `pages` 仍是列设置。后端把 v1 归一成 v2 下发；前端对 `version` / 未知分片都保持宽容，
 * 避免某个字段异常让整份设置读不出来（读不出就意味着用户所有偏好回默认）。</p>
 */
const settingsSectionSchema = z.object({
  value: z.unknown(),
  clientUpdatedAt: z.string().optional(),
  serverUpdatedAt: z.string().optional(),
})

export const userAccountSettingsSchema = z.object({
  /** v1 数据只有 pages；缺 version 时按 v2 兜底读取。 */
  version: z.number().int().catch(2),
  sections: z.record(z.string(), settingsSectionSchema).catch({}),
  pages: z.record(z.string(), columnSettingsPageSchema).catch({}),
})

export type UserAccountSettings = z.output<typeof userAccountSettingsSchema>
export type UserAccountSettingsSection = z.output<typeof settingsSectionSchema>

/** PUT 载荷里的单个分片：只提交变化的分片，`clientUpdatedAt` 用于服务端比较新旧。 */
export interface UserAccountSettingsSectionInput {
  value: unknown
  clientUpdatedAt?: string
}

export type UserAccountSettingsSections = Record<
  string,
  UserAccountSettingsSectionInput
>

export function getUserAccountSettings() {
  return apiGet(ENDPOINTS.ACCOUNT_SETTINGS, userAccountSettingsSchema)
}

export function saveUserAccountSettings(sections: UserAccountSettingsSections) {
  return apiPut(
    ENDPOINTS.ACCOUNT_SETTINGS,
    userAccountSettingsSchema,
    { sections },
    withIdempotencyKey(),
  )
}
