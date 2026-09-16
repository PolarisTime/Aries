import {
  AxiosHeaders,
  type AxiosRequestConfig,
  type RawAxiosRequestHeaders,
} from 'axios'

/** 与 ApiRequestConfig 同形, 避免业务层直接依赖底层 http 实例模块。 */
type ConcurrencyRequestConfig = AxiosRequestConfig & {
  suppressGlobalErrorStatuses?: readonly number[]
}

/** 规范资源版本前置条件头(替代 If-Match 弱验证器用法)。 */
export const RESOURCE_VERSION_HEADER = 'X-Resource-Version'

/** 版本不匹配: 412 Precondition Failed。 */
export const VERSION_CONFLICT_STATUS = 412
/** 缺少版本前置条件: 428 Precondition Required。 */
export const PRECONDITION_REQUIRED_STATUS = 428
/** 他人签出锁冲突 / 唯一键冲突: 409 Conflict。 */
export const LOCK_CONFLICT_STATUS = 409

export const VERSION_CONFLICT_CODE = 4120
export const PRECONDITION_REQUIRED_CODE = 4280
export const CONCURRENT_MODIFICATION_CODE = 4090

/** 并发写请求需要抑制的全局错误状态码: 由业务层统一呈现冲突。 */
const SUPPRESSED_STATUSES = [
  LOCK_CONFLICT_STATUS,
  VERSION_CONFLICT_STATUS,
  PRECONDITION_REQUIRED_STATUS,
] as const

/** 乐观锁版本号: 非负整数字符串; 空值或非法值返回 undefined。 */
export function normalizeVersion(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const text = String(value).trim()
  return /^\d+$/.test(text) ? text : undefined
}

function cloneHeaders(
  headers: AxiosRequestConfig['headers'],
): RawAxiosRequestHeaders {
  if (!headers) return {}
  if (headers instanceof AxiosHeaders) return { ...headers.toJSON() }
  return { ...headers }
}

/**
 * 组合乐观并发请求配置: 携带 X-Resource-Version 版本头, 并抑制全局 409/412/428 提示,
 * 由调用方自行呈现冲突处理; headers 合并风格与 withIdempotencyKey 一致。
 */
export function withConcurrencyHeaders(
  version: string | undefined,
  config?: ConcurrencyRequestConfig,
): ConcurrencyRequestConfig {
  const base = config ?? {}
  const headers = cloneHeaders(base.headers)
  if (version) headers[RESOURCE_VERSION_HEADER] = version
  const suppressed = [...(base.suppressGlobalErrorStatuses ?? [])]
  for (const status of SUPPRESSED_STATUSES) {
    if (!suppressed.includes(status)) suppressed.push(status)
  }
  return {
    ...base,
    headers,
    suppressGlobalErrorStatuses: suppressed,
  }
}

/** 从响应头读取服务端权威版本号; 缺失或非法返回 undefined。 */
export function readResourceVersionHeader(
  headers: unknown,
): string | undefined {
  if (!headers) return undefined
  const source = headers as {
    get?: (name: string) => unknown
    [key: string]: unknown
  }
  const raw =
    typeof source.get === 'function'
      ? (source.get(RESOURCE_VERSION_HEADER) ??
        source.get(RESOURCE_VERSION_HEADER.toLowerCase()))
      : (source[RESOURCE_VERSION_HEADER] ??
        source[RESOURCE_VERSION_HEADER.toLowerCase()])
  return normalizeVersion(raw)
}
