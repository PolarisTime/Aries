import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ENDPOINTS } from '@/constants/endpoints'

const { apiGetMock, apiPutMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPut: apiPutMock,
  apiPost: vi.fn(),
  apiDeleteNoContent: vi.fn(),
}))

vi.mock('@/api/core/idempotency', () => ({
  // 透传调用方 config：同步层要往请求里塞 suppressGlobalErrorStatuses，mock 不能把它吃掉
  withIdempotencyKey: (config: Record<string, unknown> = {}) => ({
    ...config,
    headers: { 'X-Idempotency-Key': 'test-idempotency-key' },
  }),
  withIdempotencyKeySuppressingErrors: (
    statuses: readonly number[],
    config: Record<string, unknown> = {},
  ) => ({
    ...config,
    suppressGlobalErrorStatuses: statuses,
    headers: { 'X-Idempotency-Key': 'test-idempotency-key' },
  }),
}))

import {
  getUserColumnSettings,
  saveUserAccountSettings,
  saveUserColumnSettings,
  userAccountSettingsSchema,
} from './user-preferences'

const settingsPayload = {
  version: 2,
  sections: {
    ui: {
      value: { fontSize: 14 },
      clientUpdatedAt: '2026-11-14T07:05:00Z',
      serverUpdatedAt: '2026-11-14T07:05:01Z',
    },
  },
  pages: {
    'sales-order': {
      orderedKeys: ['no', 'customer'],
      hiddenKeys: ['remark'],
      columnSizes: { no: 120 },
    },
  },
}

describe('user-preferences（/account/settings v2）', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPutMock.mockReset()
  })

  it('列设置读取走 /account/settings 的 pages（不再有旧的 preferences 端点）', async () => {
    apiGetMock.mockResolvedValueOnce(settingsPayload)

    const result = await getUserColumnSettings()

    expect(apiGetMock).toHaveBeenCalledWith(
      ENDPOINTS.ACCOUNT_SETTINGS,
      userAccountSettingsSchema,
    )
    expect(result.pages['sales-order'].orderedKeys).toEqual(['no', 'customer'])
  })

  it('列设置保存只提交 pages（整段替换），并带幂等键', async () => {
    apiPutMock.mockResolvedValueOnce(settingsPayload)

    const payload = {
      pages: {
        'sales-order': { orderedKeys: ['no'], hiddenKeys: [] },
      },
    }
    const result = await saveUserColumnSettings(payload)

    expect(apiPutMock).toHaveBeenCalledTimes(1)
    const [url, schema, body, config] = apiPutMock.mock.calls[0]
    expect(url).toBe(ENDPOINTS.ACCOUNT_SETTINGS)
    expect(schema).toBe(userAccountSettingsSchema)
    expect(body).toEqual(payload)
    expect(config.headers['X-Idempotency-Key']).toBe('test-idempotency-key')
    expect(result.pages['sales-order'].orderedKeys).toEqual(['no', 'customer'])
  })

  it('同步引擎只提交 sections：请求体不含 pages，因此不会清掉列设置', async () => {
    apiPutMock.mockResolvedValueOnce(settingsPayload)

    await saveUserAccountSettings({
      ui: { value: { fontSize: 16 }, clientUpdatedAt: '2026-11-14T07:06:00Z' },
    })

    const [, , body] = apiPutMock.mock.calls[0]
    expect(body).toEqual({
      sections: {
        ui: {
          value: { fontSize: 16 },
          clientUpdatedAt: '2026-11-14T07:06:00Z',
        },
      },
    })
    expect(body).not.toHaveProperty('pages')
  })

  it('409/413 交给同步层提示：请求上声明抑制全局错误 toast，避免一次冲突弹两条', async () => {
    apiPutMock.mockResolvedValueOnce(settingsPayload)

    await saveUserAccountSettings({
      ui: { value: { fontSize: 16 }, clientUpdatedAt: '2026-11-14T07:06:00Z' },
    })

    const [, , , config] = apiPutMock.mock.calls[0]
    expect(config).toMatchObject({
      suppressGlobalErrorStatuses: [409, 413],
      headers: { 'X-Idempotency-Key': 'test-idempotency-key' },
    })
  })
})
