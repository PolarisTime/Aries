import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPutMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPut: apiPutMock,
}))

import {
  fetchProjectPriceRules,
  saveProjectPriceRules,
} from './project-price-rules'

describe('project-price-rules API', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPutMock.mockReset()
  })

  it('查询归一化雪花 ID 字符串与数值字段', async () => {
    apiGetMock.mockResolvedValue([
      {
        id: '700500000000000130',
        name: '含税价',
        mode: 'ADD',
        amount: '30.00',
        remark: '说明',
        sortOrder: '0',
      },
    ])

    const [rule] = await fetchProjectPriceRules('100000000000000001')

    expect(rule.id).toBe('700500000000000130')
    expect(rule.name).toBe('含税价')
    expect(rule.mode).toBe('ADD')
    expect(rule.amount).toBe(30)
    expect(rule.remark).toBe('说明')
    expect(apiGetMock.mock.calls[0][0]).toBe(
      '/projects/100000000000000001/price-rules',
    )
  })

  it('未知方向归一为 ADD', async () => {
    apiGetMock.mockResolvedValue([
      { id: '1', name: 'x', mode: 'WHATEVER', amount: 5, sortOrder: 0 },
    ])
    const [rule] = await fetchProjectPriceRules('9')
    expect(rule.mode).toBe('ADD')
  })

  it('保存按路径 ID 提交整体替换请求体', async () => {
    apiPutMock.mockResolvedValue([])
    await saveProjectPriceRules('9', [
      { id: '3', name: '含税价', mode: 'ADD', amount: 30, remark: '备注' },
      { name: '新规则', mode: 'SUBTRACT', amount: 10 },
    ])

    const [url, , payload] = apiPutMock.mock.calls[0]
    expect(url).toBe('/projects/9/price-rules')
    expect(payload).toEqual([
      { id: '3', name: '含税价', mode: 'ADD', amount: 30, remark: '备注' },
      { name: '新规则', mode: 'SUBTRACT', amount: 10 },
    ])
  })
})
