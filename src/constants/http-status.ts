/**
 * 前端用到的 HTTP 状态码镜像（与后端 `ErrorCode` 的 code→状态映射保持一致）。
 *
 * <p>只登记**实际会分支判断或需要与后端对齐**的状态码，不是 HTTP 状态码全表。
 * 412/428/429/503 对应后端 `PRECONDITION_FAILED` / `PRECONDITION_REQUIRED` /
 * `TOO_MANY_REQUESTS` / `SERVICE_UNAVAILABLE`，分别由
 * `ResourceVersionPrecondition`、`RateLimitFilter`、`ExportConcurrencyGuard` 抛出。</p>
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  /** 资源版本前置条件不满足：客户端带的版本已过期，需刷新后重试。 */
  PRECONDITION_FAILED: 412,
  /** 缺少资源版本前置条件：写请求未带 `X-Resource-Version`。 */
  PRECONDITION_REQUIRED: 428,
  /** 请求过于频繁：限流/并发闸门拒绝，引导「稍后重试」。 */
  TOO_MANY_REQUESTS: 429,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  /** 依赖服务不可用（如 Redis 不可用），不是代码缺陷，引导稍后重试。 */
  SERVICE_UNAVAILABLE: 503,
} as const
