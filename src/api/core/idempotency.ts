import {
  AxiosHeaders,
  type AxiosRequestConfig,
  type RawAxiosRequestHeaders,
} from 'axios'

const IDEMPOTENCY_HEADER = 'X-Idempotency-Key'

export function createIdempotencyKey(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `idem-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`
}

function cloneRequestHeaders(
  headers: AxiosRequestConfig['headers'],
): RawAxiosRequestHeaders {
  if (!headers) {
    return {}
  }

  if (headers instanceof AxiosHeaders) {
    return { ...headers.toJSON() }
  }

  return { ...headers }
}

/**
 * 附加 `X-Idempotency-Key`。
 *
 * <p>泛型 `Config` 透传调用方的扩展配置（如 `ApiRequestConfig.suppressGlobalErrorStatuses`、
 * `responseType`），返回形状与入参一致，便于继续传给 apiPost/apiPut/downloadPost 等客户端方法。</p>
 *
 * <p>未显式传 `idempotencyKey` 时在**本次请求创建时生成一次**：调用方若在同一次用户动作内
 * 重试，应传入同一个 key（鉴权换令牌重试复用同一份请求配置，key 天然不变）。</p>
 */
export function withIdempotencyKey<
  Config extends AxiosRequestConfig = AxiosRequestConfig,
>(config?: Config, idempotencyKey?: string): Config {
  const headers = cloneRequestHeaders(config?.headers)

  if (!headers[IDEMPOTENCY_HEADER]) {
    headers[IDEMPOTENCY_HEADER] =
      idempotencyKey?.trim() || createIdempotencyKey()
  }

  // 只替换 headers, 其余字段原样透传; TS 无法证明泛型展开后仍是 Config, 这里做一次窄断言。
  return {
    ...(config || {}),
    headers,
  } as Config
}

/**
 * 附幂等键，并声明「这些状态码由调用方自己提示」。
 *
 * <p>典型场景：设置同步的 409（分片时间戳落后）与 413（分片超限）由同步引擎自己处理并提示，
 * 全局拦截器再 toast 一次就会连弹两条，而且那条是后端内部措辞
 * （「设置已在其他设备更新，请采用服务端值：supplierQuote」）。</p>
 *
 * <p>放在 core 里而不是业务文件里：业务代码不允许直接 import `@/api/core/http` 的
 * `ApiRequestConfig`（no-restricted-syntax 门禁），这里替它把类型收口。</p>
 */
export function withIdempotencyKeySuppressingErrors(
  statuses: readonly number[],
  config?: AxiosRequestConfig & {
    suppressGlobalErrorStatuses?: readonly number[]
  },
): AxiosRequestConfig & { suppressGlobalErrorStatuses?: readonly number[] } {
  return withIdempotencyKey({
    ...config,
    suppressGlobalErrorStatuses: statuses,
  })
}
