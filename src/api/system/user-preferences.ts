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

/**
 * 列表页列设置的读接口（v2：`GET /account/settings` 的 `pages` 字段）。
 *
 * <p>旧的 preferences 别名端点已删除；保留函数名是为了让调用方不感知端点迁移。
 * 列设置与个人设置共用同一次 GET（`user-settings-sync` 里的单飞请求）。</p>
 */
export async function getUserColumnSettings() {
  const settings = await getUserAccountSettings()
  return { pages: settings.pages }
}

/**
 * 列表页列设置的写接口（v2：`PUT /account/settings` 的 `pages` 字段，整段替换）。
 *
 * <p>只提交 `pages`，不会带上 `sections`：服务端对缺失字段保持原样，因此列设置保存
 * 不会清掉同步引擎写入的分片；反之同步引擎只传 `sections`，也不会清掉列设置。</p>
 */
export async function saveUserColumnSettings(
  payload: UserColumnSettingsPayload,
) {
  const settings = await saveUserAccountSettingsUpdate({
    pages: payload.pages,
  })
  return { pages: settings.pages }
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

/**
 * PUT 载荷：`sections` 只提交变化的分片（LWW）；`pages` 是列设置，整段替换、不参与 LWW。
 *
 * <p>两者可同时提交，服务端对缺失字段保持原样 —— 同步引擎只传 `sections`、列设置只传 `pages`，
 * 不会互相清空。</p>
 */
export interface UserAccountSettingsUpdate {
  sections?: UserAccountSettingsSections
  pages?: UserAccountSettings['pages']
}

export function getUserAccountSettings() {
  return apiGet(ENDPOINTS.ACCOUNT_SETTINGS, userAccountSettingsSchema)
}

/**
 * 个人设置同步引擎的入口（只提交 `sections`，不会带上 `pages`）。
 *
 * <p>`pages` 由列设置单独提交（见 {@link saveUserColumnSettings}）；服务端缺失字段保持原样，
 * 因此两条写通路并存也不会互相覆盖。</p>
 */
export function saveUserAccountSettings(sections: UserAccountSettingsSections) {
  return saveUserAccountSettingsUpdate({ sections })
}

/**
 * PUT `/account/settings` 的统一出口：sections 分片与 pages 列设置可同时提交。
 *
 * <p>服务端语义：`sections` 按分片 LWW（409 时整体不落库），`pages` 整段替换、不参与 LWW；
 * 两者都可选，缺失即保持原样。这样同步引擎（只传 sections）与列设置（只传 pages）
 * 各走各的字段，不会互相覆盖。</p>
 */
function saveUserAccountSettingsUpdate(update: UserAccountSettingsUpdate) {
  return apiPut(
    ENDPOINTS.ACCOUNT_SETTINGS,
    userAccountSettingsSchema,
    update,
    withIdempotencyKey(),
  )
}
