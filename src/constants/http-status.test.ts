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
    expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422)
  })

  it('5xx 服务端错误状态码', () => {
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500)
  })

  it('状态码互不重复', () => {
    const values = Object.values(HTTP_STATUS)
    expect(new Set(values).size).toBe(values.length)
  })
})
