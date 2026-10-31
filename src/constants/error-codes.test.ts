import { describe, expect, it } from 'vitest'
import { ERROR_CODE } from '@/constants/error-codes'

describe('ERROR_CODE', () => {
  it('成功码为 0', () => {
    expect(ERROR_CODE.SUCCESS).toBe(0)
  })

  it('校验与鉴权错误码', () => {
    expect(ERROR_CODE.VALIDATION_ERROR).toBe(4000)
    expect(ERROR_CODE.UNAUTHORIZED).toBe(4010)
    expect(ERROR_CODE.SESSION_EVICTED).toBe(4011)
    expect(ERROR_CODE.FORBIDDEN).toBe(4030)
  })

  it('资源与冲突错误码', () => {
    expect(ERROR_CODE.NOT_FOUND).toBe(4040)
    expect(ERROR_CODE.CONCURRENT_MODIFICATION).toBe(4090)
    expect(ERROR_CODE.REFRESH_TOKEN_REUSE_CONFLICT).toBe(4091)
    // 幂等冲突：与后端 ErrorCode.IDEMPOTENCY_CONFLICT 同步（HTTP 409，
    // 刻意不复用 4090，因为两者对用户的引导不同：等待 vs 刷新重试）
    expect(ERROR_CODE.IDEMPOTENCY_CONFLICT).toBe(4092)
  })

  it('请求格式与业务错误码', () => {
    expect(ERROR_CODE.METHOD_NOT_ALLOWED).toBe(4050)
    expect(ERROR_CODE.PAYLOAD_TOO_LARGE).toBe(4130)
    expect(ERROR_CODE.UNSUPPORTED_MEDIA_TYPE).toBe(4150)
    expect(ERROR_CODE.BUSINESS_ERROR).toBe(4220)
  })

  it('服务端错误码', () => {
    expect(ERROR_CODE.INTERNAL_ERROR).toBe(5000)
    // 依赖服务不可用（Redis 抖动等）为 5030 + HTTP 503，不再伪装成 5000
    expect(ERROR_CODE.SERVICE_UNAVAILABLE).toBe(5030)
  })

  it('版本前置条件与限流错误码（与后端 ErrorCode 逐项对齐）', () => {
    // 4120 + HTTP 412：ResourceVersionPrecondition 在版本过期时抛出，引导「刷新后重试」
    expect(ERROR_CODE.PRECONDITION_FAILED).toBe(4120)
    // 4280 + HTTP 428：写请求缺少 X-Resource-Version
    expect(ERROR_CODE.PRECONDITION_REQUIRED).toBe(4280)
    // 4290 + HTTP 429：RateLimitFilter / ExportConcurrencyGuard 拒绝，引导「稍后重试」
    expect(ERROR_CODE.TOO_MANY_REQUESTS).toBe(4290)
  })

  it('完整集合与后端 ErrorCode 镜像一致（新增/改名必须两侧同步）', () => {
    // 后端 com.leo.erp.common.error.ErrorCode 的全部枚举项；多一项/少一项都应失败。
    expect(ERROR_CODE).toEqual({
      SUCCESS: 0,
      VALIDATION_ERROR: 4000,
      UNAUTHORIZED: 4010,
      SESSION_EVICTED: 4011,
      FORBIDDEN: 4030,
      NOT_FOUND: 4040,
      METHOD_NOT_ALLOWED: 4050,
      NOT_ACCEPTABLE: 4060,
      CONCURRENT_MODIFICATION: 4090,
      REFRESH_TOKEN_REUSE_CONFLICT: 4091,
      IDEMPOTENCY_CONFLICT: 4092,
      PRECONDITION_FAILED: 4120,
      PAYLOAD_TOO_LARGE: 4130,
      UNSUPPORTED_MEDIA_TYPE: 4150,
      BUSINESS_ERROR: 4220,
      PRECONDITION_REQUIRED: 4280,
      TOO_MANY_REQUESTS: 4290,
      INTERNAL_ERROR: 5000,
      SERVICE_UNAVAILABLE: 5030,
    })
  })

  it('错误码互不重复', () => {
    const values = Object.values(ERROR_CODE)
    expect(new Set(values).size).toBe(values.length)
  })

  it('业务错误码为 422（与后端 ErrorCode.BUSINESS_ERROR 一致）', () => {
    expect(ERROR_CODE.BUSINESS_ERROR).toBe(4220)
  })
})
