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
  })

  it('请求格式与业务错误码', () => {
    expect(ERROR_CODE.METHOD_NOT_ALLOWED).toBe(4050)
    expect(ERROR_CODE.PAYLOAD_TOO_LARGE).toBe(4130)
    expect(ERROR_CODE.UNSUPPORTED_MEDIA_TYPE).toBe(4150)
    expect(ERROR_CODE.BUSINESS_ERROR).toBe(4220)
  })

  it('服务端错误码', () => {
    expect(ERROR_CODE.INTERNAL_ERROR).toBe(5000)
  })

  it('错误码互不重复', () => {
    const values = Object.values(ERROR_CODE)
    expect(new Set(values).size).toBe(values.length)
  })

  it('业务错误码为 422（与后端 ErrorCode.BUSINESS_ERROR 一致）', () => {
    expect(ERROR_CODE.BUSINESS_ERROR).toBe(4220)
  })
})
