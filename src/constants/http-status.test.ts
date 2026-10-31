import { describe, expect, it } from 'vitest'
import { HTTP_STATUS } from '@/constants/http-status'

describe('HTTP_STATUS', () => {
  it('2xx 成功状态码', () => {
    expect(HTTP_STATUS.OK).toBe(200)
    expect(HTTP_STATUS.CREATED).toBe(201)
    expect(HTTP_STATUS.NO_CONTENT).toBe(204)
  })

  it('4xx 客户端错误状态码', () => {
    expect(HTTP_STATUS.BAD_REQUEST).toBe(400)
    expect(HTTP_STATUS.UNAUTHORIZED).toBe(401)
    expect(HTTP_STATUS.FORBIDDEN).toBe(403)
    expect(HTTP_STATUS.NOT_FOUND).toBe(404)
    expect(HTTP_STATUS.CONFLICT).toBe(409)
    expect(HTTP_STATUS.PRECONDITION_FAILED).toBe(412)
    expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422)
    expect(HTTP_STATUS.PRECONDITION_REQUIRED).toBe(428)
    expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429)
  })

  it('5xx 服务端错误状态码', () => {
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500)
    // 依赖服务不可用（Redis 等）与 500「代码缺陷」分开，前端可给出不同的恢复建议
    expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503)
  })

  it('完整集合与后端错误映射一致（新增必须显式确认）', () => {
    expect(HTTP_STATUS).toEqual({
      OK: 200,
      CREATED: 201,
      NO_CONTENT: 204,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      PRECONDITION_FAILED: 412,
      UNPROCESSABLE_ENTITY: 422,
      PRECONDITION_REQUIRED: 428,
      TOO_MANY_REQUESTS: 429,
      INTERNAL_SERVER_ERROR: 500,
      SERVICE_UNAVAILABLE: 503,
    })
  })

  it('状态码互不重复', () => {
    const values = Object.values(HTTP_STATUS)
    expect(new Set(values).size).toBe(values.length)
  })
})
