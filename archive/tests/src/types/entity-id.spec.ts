import { beforeEach, describe, expect, it, vi } from 'vitest'

import { logger } from '@/utils/logger'
import {
  EntityIdContractError,
  normalizeEntityIds,
  parseEntityId,
  parseOptionalEntityId,
} from './entity-id'

describe('EntityId API 边界', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('逐字符保留合法的 19 位雪花 ID 字符串', () => {
    expect(parseEntityId('308251467645452289')).toBe('308251467645452289')
  })

  it('兼容安全正整数并记录契约告警', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)

    expect(parseEntityId(42, 'customerId')).toBe('42')
    expect(warn).toHaveBeenCalledWith(
      'API 返回了旧版数值实体 ID，已兼容转换为字符串',
      { field: 'customerId', value: 42 },
    )
  })

  it.each([
    Number.MAX_SAFE_INTEGER + 1,
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    '0',
    '-1',
    '1.5',
    '1e3',
    ' 42',
    '42 ',
    'abc',
    '9223372036854775808',
    42n,
  ])('拒绝非法或可能失真的实体 ID：%s', (value) => {
    expect(() => parseEntityId(value, 'record.id')).toThrow(
      EntityIdContractError,
    )
  })

  it('可选 ID 仅把 null、undefined 和空字符串视为未提供', () => {
    expect(parseOptionalEntityId(undefined)).toBeUndefined()
    expect(parseOptionalEntityId(null)).toBeUndefined()
    expect(parseOptionalEntityId('')).toBeUndefined()
    expect(() => parseOptionalEntityId(' ')).toThrow(EntityIdContractError)
  })

  it('递归规范化声明过的头、明细、来源 ID 和 ID 数组', () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)

    expect(
      normalizeEntityIds({
        id: '308251467645452289',
        customerId: 42,
        purchaseRefundId: 45,
        sourceDocumentId: 46,
        traceId: '6acf118c7cdf26b9161441283d1a696c',
        requestId: 'request-1',
        items: [
          {
            id: '308251467645452290',
            materialId: '308251467645452291',
            sourcePurchaseOrderItemId: 43,
            attachmentIds: ['308251467645452292', 44],
            tokenId: 'token-1',
          },
        ],
      }),
    ).toEqual({
      id: '308251467645452289',
      customerId: '42',
      purchaseRefundId: '45',
      sourceDocumentId: '46',
      traceId: '6acf118c7cdf26b9161441283d1a696c',
      requestId: 'request-1',
      items: [
        {
          id: '308251467645452290',
          materialId: '308251467645452291',
          sourcePurchaseOrderItemId: '43',
          attachmentIds: ['308251467645452292', '44'],
          tokenId: 'token-1',
        },
      ],
    })
  })

  it('嵌套身份字段无效时按完整字段路径失败关闭', () => {
    expect(() =>
      normalizeEntityIds({
        id: '1',
        items: [{ id: '2', warehouseId: Number.MAX_SAFE_INTEGER + 1 }],
      }),
    ).toThrow('items[0].warehouseId')
  })
})
