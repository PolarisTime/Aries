// TODO: remove @ts-nocheck — fix AxiosRequestConfig headers type to use AxiosRequestHeaders instead of Record<string, unknown>
// @ts-nocheck
import type { AxiosRequestConfig } from 'axios'

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

export function withIdempotencyKey(
  config?: AxiosRequestConfig,
): AxiosRequestConfig {
  const headers = {
    ...(config?.headers || {}),
  } as Record<string, unknown>

  if (!headers[IDEMPOTENCY_HEADER]) {
    headers[IDEMPOTENCY_HEADER] = createIdempotencyKey()
  }

  return {
    ...(config || {}),
    headers,
  }
}
