import { saveBusinessModule } from '@/api/business/business-crud'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type {
  SalesReturn,
  SalesReturnCandidates,
  SalesReturnSaveRequest,
} from '@/shared/schemas/module-record'
import { salesReturnCandidatesSchema } from '@/shared/schemas/module-record'
import type { MainFlowEditorDraft } from '@/types/module-record'

/*
 * 销售退货的增删改审走统一 module 通道（`business-crud` + 页面配置里的 actions），
 * 这里只保留两条**专属**接口：
 *
 * - 来源候选（按已审核销售出库读取可退明细）；
 * - 从来源候选直接生成退货草稿（请求体字段与统一保存契约不同，需要显式映射）。
 *
 * 原先还有 list/get/create/update/audit/saveAndAudit/updateStatus/delete 八个逐函数包装，
 * 它们只是把 `MODULE_KEY` 转发给 `business-crud`，且全仓零调用方 —— 已删除。
 * 需要这些能力时直接调 `business-crud` 的通用函数，不要再加回逐单据包装。
 */
const MODULE_KEY = 'sales-return' as const

/**
 * 销售退货来源候选：按已审核销售出库读取可退明细（含已退/可退数量）。
 */
export function getSalesReturnCandidates(
  salesOutboundId: string,
  signal?: AbortSignal,
): Promise<SalesReturnCandidates> {
  return apiGet(
    ENDPOINTS.SALES_RETURN_CANDIDATES,
    salesReturnCandidatesSchema,
    { params: { salesOutboundId }, signal },
  )
}

/**
 * 来源候选请求体 → 统一保存通道的编辑草稿。
 *
 * <p>此前这里用 `as unknown as MainFlowEditorDraft<...>` 强转，等于把「后端保存契约」
 * 与「编辑器草稿」之间的差异全部跳过：请求体字段白名单/ID 序列化的前置假设无从校验，
 * 新增/改名字段也不会被 tsc 发现。现在改为显式映射，让两侧类型真正对上。</p>
 *
 * <p>明细行的 `id` 统一给空串：来源出库明细 id 不是本单明细的持久化 id，直接透传会被
 * 当成「本单已有的明细 id」写进请求；空串经 `toPersistedLineItemId` 判定为非持久化 id，
 * 序列化时被丢弃，语义就是新增行。</p>
 */
function toSalesReturnEditorDraft(
  payload: SalesReturnSaveRequest,
): MainFlowEditorDraft<typeof MODULE_KEY> {
  return {
    // 逐字段透传：草稿类型由同一份保存契约派生，字段类型对不上时 tsc 会报错。
    ...payload,
    status: payload.status ?? undefined,
    items: payload.items.map((item) => ({ ...item, id: '' })),
  }
}

/**
 * 从销售出库来源候选直接创建退货草稿；请求体已按来源契约组装，
 * 经由统一保存通道完成字段白名单与实体 ID 序列化。
 */
export function createSalesReturnFromSource(
  payload: SalesReturnSaveRequest,
  idempotencyKey?: string,
): Promise<SalesReturn> {
  return saveBusinessModule(
    MODULE_KEY,
    toSalesReturnEditorDraft(payload),
    idempotencyKey,
  )
}
