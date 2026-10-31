import { describe, expect, it } from 'vitest'
import {
  conflictResourceKey,
  isConflictError,
  isLockConflict,
  isVersionConflict,
  LOCK_CONFLICT_CODE,
  LOCK_CONFLICT_STATUS,
  OVERRIDE_MAX_ATTEMPTS,
  PRECONDITION_REQUIRED_CODE,
  PRECONDITION_REQUIRED_STATUS,
  type SheetsConflict,
  VERSION_CONFLICT_CODE,
  VERSION_CONFLICT_STATUS,
} from './sheet-conflict-policy'

/** 构造一个带传输层 status/code 的请求错误(readRequestError 只读这两个顶层字段)。 */
function requestError(fields: { status?: number; code?: number }): Error {
  return Object.assign(new Error('request failed'), fields)
}

describe('并发冲突判定(sheet-conflict-policy)', () => {
  it('版本冲突覆盖 412/428 与业务码 4120/4280', () => {
    expect(
      isVersionConflict(requestError({ status: VERSION_CONFLICT_STATUS })),
    ).toBe(true)
    expect(
      isVersionConflict(requestError({ status: PRECONDITION_REQUIRED_STATUS })),
    ).toBe(true)
    expect(
      isVersionConflict(requestError({ code: VERSION_CONFLICT_CODE })),
    ).toBe(true)
    expect(
      isVersionConflict(requestError({ code: PRECONDITION_REQUIRED_CODE })),
    ).toBe(true)
    expect(isVersionConflict(requestError({ status: 500 }))).toBe(false)
  })

  it('签出锁冲突只认 409/4090, 不与版本冲突混淆', () => {
    expect(isLockConflict(requestError({ status: LOCK_CONFLICT_STATUS }))).toBe(
      true,
    )
    expect(isLockConflict(requestError({ code: LOCK_CONFLICT_CODE }))).toBe(
      true,
    )
    expect(
      isLockConflict(requestError({ status: VERSION_CONFLICT_STATUS })),
    ).toBe(false)
    expect(
      isVersionConflict(requestError({ status: LOCK_CONFLICT_STATUS })),
    ).toBe(false)
  })

  it('isConflictError 是两类冲突的并集, 非对象/空值不视为冲突', () => {
    expect(isConflictError(requestError({ status: 409 }))).toBe(true)
    expect(isConflictError(requestError({ status: 412 }))).toBe(true)
    expect(isConflictError(undefined)).toBe(false)
    expect(isConflictError(null)).toBe(false)
    expect(isConflictError('412')).toBe(false)
    expect(isConflictError(requestError({ status: 400 }))).toBe(false)
  })

  it('冲突资源键: 表头与商品行同属单据资源, 项目配置独立', () => {
    expect(conflictResourceKey('sheet', 'sheet-1')).toBe('sheet:sheet-1')
    expect(conflictResourceKey('item', 'sheet-1')).toBe('sheet:sheet-1')
    expect(conflictResourceKey('config', 'project-1')).toBe('config:project-1')
    // 商品行冲突额外带 itemId, 但资源键仍按单据归并
    const itemConflict: SheetsConflict = {
      kind: 'item',
      id: 'sheet-1',
      itemId: 'item-9',
    }
    expect(conflictResourceKey(itemConflict.kind, itemConflict.id)).toBe(
      'sheet:sheet-1',
    )
  })

  it('覆盖重试有上限, 不会无限连环冲突', () => {
    expect(OVERRIDE_MAX_ATTEMPTS).toBeGreaterThan(1)
    expect(Number.isInteger(OVERRIDE_MAX_ATTEMPTS)).toBe(true)
  })
})
