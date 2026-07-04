import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock },
}))

import type { RuntimeConfigResponse } from '@/types/runtime-config'
import { getRuntimeConfig } from './runtime-config'

describe('runtime-config api', () => {
  const runtimeConfig: RuntimeConfigResponse = {
    ui: {
      defaultPageSize: 20,
      showSnowflakeId: true,
      watermark: {
        enabled: true,
        content: '{username}  {time}',
        fontSize: 18,
        color: 'rgba(0,0,0,0.08)',
        rotate: -22,
        density: 200,
      },
    },
    business: {
      defaultTaxRate: 0.13,
      statement: {
        customerReceiptAmountZero: true,
        supplierFullPayment: false,
      },
      businessNo: {
        useSnowflakeId: false,
      },
    },
    features: {
      weightOnlyPurchaseInbound: false,
      weightOnlySalesOutbound: true,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  it('loads runtime config from runtime-config endpoint', async () => {
    httpGetMock.mockResolvedValue({ code: 0, data: runtimeConfig })

    const result = await getRuntimeConfig()

    expect(httpGetMock).toHaveBeenCalledWith('/runtime-config')
    expect(assertApiSuccessMock).toHaveBeenCalledWith(
      { code: 0, data: runtimeConfig },
      '加载运行时配置失败',
    )
    expect(result).toEqual(runtimeConfig)
  })

  it('throws when API response is not successful', async () => {
    httpGetMock.mockResolvedValue({ code: -1, message: 'error', data: null })
    assertApiSuccessMock.mockImplementation(() => {
      throw new Error('加载运行时配置失败')
    })

    await expect(getRuntimeConfig()).rejects.toThrow('加载运行时配置失败')
  })
})
