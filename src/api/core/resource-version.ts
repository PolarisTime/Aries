import {
  AxiosHeaders,
  type AxiosRequestConfig,
  type RawAxiosRequestHeaders,
} from 'axios'
import { readRequestError } from '@/api/core/request-errors'
import {
  LOCK_CONFLICT_STATUS,
  normalizeVersion,
  PRECONDITION_REQUIRED_STATUS,
  RESOURCE_VERSION_HEADER,
  VERSION_CONFLICT_STATUS,
} from '@/api/market/quote-concurrency'
import { ERROR_CODE } from '@/constants/error-codes'

/**
 * 资源版本前置条件（X-Resource-Version）的通用接线。
 *
 * <p>头名、版本号规范化与错误状态码复用 `@/api/market/quote-concurrency` 的既有实现，
 * 不在这里复制一份；该模块目前位于 market 目录下，待并发工具后续下沉到 `api/core`
 * 时改导入即可（对外 API 不变）。</p>
 */

export { RESOURCE_VERSION_HEADER } from '@/api/market/quote-concurrency'

/** 与 ApiRequestConfig 同形, 避免业务层直接依赖底层 http 实例模块。 */
type ResourceVersionRequestConfig = AxiosRequestConfig & {
  suppressGlobalErrorStatuses?: readonly number[]
}

/** 需要「刷新后重试」恢复动作的业务错误码：409 并发修改 / 412 版本过期 / 428 缺版本前置条件。 */
const CONCURRENCY_RECOVERY_CODES: ReadonlySet<number> = new Set([
  ERROR_CODE.CONCURRENT_MODIFICATION,
  ERROR_CODE.PRECONDITION_FAILED,
  ERROR_CODE.PRECONDITION_REQUIRED,
])

function cloneHeaders(
  headers: AxiosRequestConfig['headers'],
): RawAxiosRequestHeaders {
  if (!headers) return {}
  if (headers instanceof AxiosHeaders) return { ...headers.toJSON() }
  return { ...headers }
}

/**
 * 给更新（PUT/PATCH）请求附加版本前置条件头。
 *
 * <p><b>与 `withConcurrencyHeaders` 的区别</b>：后者会抑制全局 409/412/428 提示，
 * 供业务层自行呈现冲突弹窗；模块编辑器没有专用冲突弹窗，需要全局错误提示给出
 * 后端返回的冲突原因，因此这里只加头、不抑制任何全局提示。</p>
 *
 * <p><b>缺版本时不发空头</b>：版本缺失/非法（空串、非十进制）时完全不设置该头，
 * 后端据此返回 428，由统一错误展示引导「刷新后重试」；绝不发送 `X-Resource-Version: ''`。</p>
 */
export function withResourceVersion(
  version: string | undefined,
  config?: ResourceVersionRequestConfig,
): ResourceVersionRequestConfig {
  const normalized = normalizeVersion(version)
  if (!normalized) return config ?? {}
  const headers = cloneHeaders(config?.headers)
  if (!headers[RESOURCE_VERSION_HEADER]) {
    headers[RESOURCE_VERSION_HEADER] = normalized
  }
  return { ...(config ?? {}), headers }
}

/** 版本前置条件类错误（412 版本过期 / 428 缺少版本头）。 */
export function isResourceVersionError(error: unknown): boolean {
  const { status } = readRequestError(error)
  return (
    status === VERSION_CONFLICT_STATUS ||
    status === PRECONDITION_REQUIRED_STATUS
  )
}

/**
 * 把一次保存失败归一成「刷新后重试」恢复码。
 *
 * <p>优先用后端业务码（4090/4120/4280）；后端未回业务码时用 HTTP status
 * （409/412/428）兜底映射到同一组码，保证编辑器的恢复入口对三类冲突行为一致。
 * 非并发类错误返回 undefined。</p>
 */
export function concurrencyRecoveryCodeOf(
  status?: number,
  code?: number,
): number | undefined {
  if (code !== undefined && CONCURRENCY_RECOVERY_CODES.has(code)) return code
  if (status === LOCK_CONFLICT_STATUS) {
    return ERROR_CODE.CONCURRENT_MODIFICATION
  }
  if (status === VERSION_CONFLICT_STATUS) {
    return ERROR_CODE.PRECONDITION_FAILED
  }
  if (status === PRECONDITION_REQUIRED_STATUS) {
    return ERROR_CODE.PRECONDITION_REQUIRED
  }
  return undefined
}

/** 错误码是否属于「刷新后重试」恢复集合（4090/4120/4280）。 */
export function isConcurrencyRecoveryCode(code?: number): boolean {
  return code !== undefined && CONCURRENCY_RECOVERY_CODES.has(code)
}
