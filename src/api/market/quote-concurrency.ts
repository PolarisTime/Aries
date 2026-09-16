import {
  AxiosHeaders,
  type AxiosRequestConfig,
  type RawAxiosRequestHeaders,
} from 'axios'

/** 与 ApiRequestConfig 同形, 避免业务层直接依赖底层 http 实例模块。 */
type ConcurrencyRequestConfig = AxiosRequestConfig & {
  suppressGlobalErrorStatuses?: readonly number[]
}

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
 * 组合乐观并发请求配置: 携带 If-Match 版本头, 并抑制全局 409 提示,
 * 由调用方自行呈现冲突处理; headers 合并风格与 withIdempotencyKey 一致。
 */
export function withConcurrencyHeaders(
  version: string | undefined,
  config?: ConcurrencyRequestConfig,
): ConcurrencyRequestConfig {
  const base = config ?? {}
  const headers = cloneHeaders(base.headers)
  if (version) headers['If-Match'] = version
  const suppressed = base.suppressGlobalErrorStatuses ?? []
  return {
    ...base,
    headers,
    suppressGlobalErrorStatuses: suppressed.includes(409)
      ? suppressed
      : [...suppressed, 409],
  }
}
