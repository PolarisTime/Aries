import { z } from 'zod'
import { apiPost } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { readRequestError } from '@/api/core/request-errors'
import { ENDPOINTS } from '@/constants/endpoints'

/**
 * 协作房间票据（M5 Java 侧签发，见设计文档 §7.1）。
 *
 * ```
 * POST /api/v2/supplier-price-lists/{listId}/collab-sessions
 * → 201 { room, url, token, writable, color, expiresAt }
 * ```
 *
 * <p>`url` 是**服务端下发**的 WebSocket 地址：前端不拼 `/collab`、不猜端口，
 * 反代 / 侧车迁移都只改服务端配置（设计文档 §12）。</p>
 */

const collabSessionSchema = z.looseObject({
  room: z.string().min(1),
  url: z.string().min(1),
  token: z.string().min(1),
  writable: z.boolean().nullish(),
  color: z.string().nullish(),
  expiresAt: z.string().nullish(),
})

/** 一次协作会话的服务端票据。 */
export type CollabSession = {
  /** 房间名，如 `supplier-price:<supplierId>`；由服务端决定，前端只透传。 */
  room: string
  /** WebSocket 地址（服务端下发）。 */
  url: string
  /** 短票据（JWT，5 分钟）；重连时用 {@link CollabSessionRefresher} 换新的。 */
  token: string
  /** 无 `supplier-price-lists:update` 权限时为 false：边车只读转发。 */
  writable: boolean
  /** 该用户在协作里的固定颜色（同用户跨端一致）。 */
  color: string
  expiresAt: string | null
}

/**
 * 取票据的结果。
 *
 * <p>**不用异常表达"功能没开"**：降级是正常路径（设计文档 §9.3），调用方拿到
 * `unavailable` 就应该静默回退 REST，而不是弹错误。三种原因分开是为了决定降级提示的
 * 文案/级别：功能没开不提示，网络失败提示「离线」，鉴权失败提示「协作不可用」。</p>
 */
export type CollabSessionOutcome =
  | { kind: 'session'; session: CollabSession }
  | { kind: 'unavailable'; reason: 'not-enabled' | 'forbidden' | 'network' }

/** 换票函数：provider 重连时用它拿新 token（短票据会过期）。 */
export type CollabSessionRefresher = () => Promise<string | null>

/** 缺省颜色：服务端没下发时给一个中性色，不猜业务语义。 */
const FALLBACK_COLOR = '#1677ff'

/** 从错误里判定降级原因（状态码口径在此集中，不要在调用方各写一遍）。 */
function unavailableReasonOf(
  error: unknown,
): 'not-enabled' | 'forbidden' | 'network' {
  const status = readRequestError(error).status
  if (status === 401 || status === 403) return 'forbidden'
  if (status === 404 || status === 405 || status === 501) return 'not-enabled'
  return 'network'
}

/** 把服务端返回的松散 JSON 收敛成强类型票据。 */
function toSession(
  payload: z.output<typeof collabSessionSchema>,
): CollabSession {
  return {
    room: payload.room,
    url: payload.url,
    token: payload.token,
    // 缺省按「可写」处理：读权限的只读模式服务端应显式下发 false
    writable: payload.writable !== false,
    color: payload.color?.trim() || FALLBACK_COLOR,
    expiresAt: payload.expiresAt ?? null,
  }
}

/**
 * 「资源 id → 协作房间票据」的请求函数。
 *
 * <p>供应商价格表与报单比价共用同一套票据契约，只是资源前缀不同，因此抽成一个类型：
 * hook 侧只依赖这个函数签名，测试里注入假实现即可。</p>
 */
export type CollabSessionRequest = (
  resourceId: string,
) => Promise<CollabSessionOutcome>

/**
 * 申请协作房间票据（不抛异常）。
 *
 * <p>任何失败都收敛成 `unavailable`（降级路径），调用方据此回退 REST 自动保存。</p>
 */
async function requestCollabSessionAt(
  basePath: string,
  resourceId: string,
): Promise<CollabSessionOutcome> {
  try {
    const payload = await apiPost(
      `${basePath}/${resourceId}/collab-sessions`,
      collabSessionSchema,
      undefined,
      // 取票是 POST（创建会话资源），后端类级 @IdempotencyRequired 要求幂等键；
      // 少这个头会 422，协作直接降级成 REST（联调实测）。
      withIdempotencyKey(),
    )
    return { kind: 'session', session: toSession(payload) }
  } catch (error) {
    return { kind: 'unavailable', reason: unavailableReasonOf(error) }
  }
}

/** 供应商价格表：`POST /supplier-price-lists/{listId}/collab-sessions`。 */
export async function requestCollabSession(
  listId: string,
): Promise<CollabSessionOutcome> {
  return requestCollabSessionAt(ENDPOINTS.SUPPLIER_PRICE_LISTS, listId)
}

/** 报单比价（报价单）：`POST /quote-sheets/{sheetId}/collab-sessions`。 */
export async function requestQuoteSheetCollabSession(
  sheetId: string,
): Promise<CollabSessionOutcome> {
  return requestCollabSessionAt(ENDPOINTS.QUOTE_SHEETS, sheetId)
}

/**
 * 为重新连接准备的换票器。
 *
 * <p>HocuspocusProvider 的 `token` 支持传函数：每次建连都会调用它。短票据 5 分钟过期，
 * 长时间挂着的页面断线重连时必须换新票，否则会被边车 4401 拒绝。</p>
 */
export function createSessionRefresher(
  resourceId: string,
  request: CollabSessionRequest = requestCollabSession,
): CollabSessionRefresher {
  return async () => {
    const outcome = await request(resourceId)
    return outcome.kind === 'session' ? outcome.session.token : null
  }
}
