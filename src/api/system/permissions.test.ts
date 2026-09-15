import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ZodType } from 'zod'

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }))

vi.mock('@/api/core/client', () => ({ apiGet: apiGetMock }))

import { listPermissions } from './permissions'

describe('permissions api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listPermissions 解析权限目录并透传 signal', async () => {
    apiGetMock.mockResolvedValue([
      {
        code: 'sales-orders:read',
        resource: 'sales-orders',
        action: 'read',
        field: null,
        description: '查看销售订单',
      },
    ])
    const controller = new AbortController()

    const result = await listPermissions(controller.signal)

    expect(apiGetMock.mock.calls[0][0]).toBe('/permissions')
    expect(apiGetMock.mock.calls[0][2]).toMatchObject({
      signal: controller.signal,
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      resource: 'sales-orders',
      action: 'read',
    })
  })

  it('向 apiGet 传入权限数组契约 schema', async () => {
    apiGetMock.mockResolvedValue([])

    await listPermissions()

    const schema = apiGetMock.mock.calls[0][1] as ZodType
    expect(schema.safeParse([]).success).toBe(true)
    expect(schema.safeParse([{ resource: 'sales-orders' }]).success).toBe(false)
  })
})
