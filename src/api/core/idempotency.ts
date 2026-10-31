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
