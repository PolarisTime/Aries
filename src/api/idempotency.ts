import {
  AxiosHeaders,
  type AxiosRequestConfig,
  type RawAxiosRequestHeaders,
} from 'axios'

export const IDEMPOTENCY_HEADER = 'X-Idempotency-Key'

export function createIdempotencyKey() {
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

export function withIdempotencyKey(
  config?: AxiosRequestConfig,
): AxiosRequestConfig {
  const headers = cloneRequestHeaders(config?.headers)

  if (!headers[IDEMPOTENCY_HEADER]) {
    headers[IDEMPOTENCY_HEADER] = createIdempotencyKey()
  }

  return {
    ...(config || {}),
    headers,
  }
}
