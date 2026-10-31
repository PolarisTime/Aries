/** Manually mirrors Leo's ErrorCode enum; update both sides in the same contract change. */
export const ERROR_CODE = {
  SUCCESS: 0,
  VALIDATION_ERROR: 4000,
  UNAUTHORIZED: 4010,
  SESSION_EVICTED: 4011,
  CONCURRENT_MODIFICATION: 4090,
  REFRESH_TOKEN_REUSE_CONFLICT: 4091,
  /** 幂等冲突：同一幂等键的请求正在处理中（HTTP 409）。 */
  IDEMPOTENCY_CONFLICT: 4092,
  FORBIDDEN: 4030,
  NOT_FOUND: 4040,
  METHOD_NOT_ALLOWED: 4050,
  NOT_ACCEPTABLE: 4060,
  PAYLOAD_TOO_LARGE: 4130,
  UNSUPPORTED_MEDIA_TYPE: 4150,
  BUSINESS_ERROR: 4220,
  /**
   * 资源版本前置条件不满足（HTTP 412）：调用方带的 `X-Resource-Version` 已过期，
   * 后端由 `ResourceVersionPrecondition` 在并发保存/锁竞争时抛出。引导是「刷新后重试」，
   * 不是「稍后重试」，与 {@link TOO_MANY_REQUESTS} 区分。
   */
  PRECONDITION_FAILED: 4120,
  /** 缺少资源版本前置条件（HTTP 428）：写请求必须带 `X-Resource-Version`。 */
  PRECONDITION_REQUIRED: 4280,
  /** 请求过于频繁（HTTP 429）：限流或导出并发闸门拒绝。引导是「稍后重试」。 */
  TOO_MANY_REQUESTS: 4290,
  /** 依赖服务不可用（HTTP 503），例如 Redis 不可用。 */
  SERVICE_UNAVAILABLE: 5030,
  INTERNAL_ERROR: 5000,
} as const
