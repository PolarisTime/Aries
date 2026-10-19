import { describe, expect, it } from 'vitest'
import type { ModuleLineItem } from '@/types/module-page'
import {
  buildRemovalSnapshot,
  restoreRemovedItems,
} from '@/views/modules/use-confirmed-item-removal'

/**
 * P1-4 回归：删除选中必须可复原，且复原后**行序与内容**与删除前完全一致。
 *
 * <p>用例刻意让被删行带可区分值（单价 888）与不同的原下标（删第 1、3 行而不是尾部），
 * 这样「按原位插回」与「追加到末尾」能区分开 —— 只在尾部删除的用例两种实现同值，
 * 属于测不出口径分叉的假绿。</p>
 */
function item(id: string, unitPrice: number, name = id): ModuleLineItem {
  return { id, name, unitPrice }
}

describe('buildRemovalSnapshot / restoreRemovedItems', () => {
  const items = [item('a', 100), item('b', 888), item('c', 200), item('d', 300)]

  it('快照记录被删行的原下标与原内容，撤销后行序与内容完整复原', () => {
    const snapshot = buildRemovalSnapshot(items, ['b', 'd'])
    expect(snapshot.positions).toEqual([1, 3])
    expect(snapshot.items.map((row) => row.id)).toEqual(['b', 'd'])

    // 删除后剩下的行（与真实删除路径一致：只删选中项）。
    const afterDelete = items.filter((row) => !['b', 'd'].includes(row.id))
    expect(afterDelete.map((row) => row.id)).toEqual(['a', 'c'])

    const restored = restoreRemovedItems(afterDelete, snapshot)
    expect(restored.map((row) => row.id)).toEqual(['a', 'b', 'c', 'd'])
    // 被删行里手工录入的单价 888 必须原样回来，而不是空白行。
    expect(
      (restored.find((row) => row.id === 'b') as { unitPrice?: number })
        .unitPrice,
    ).toBe(888)
  })

  it('撤销时也会把行插回中间位置（不是追加到末尾）', () => {
    const snapshot = buildRemovalSnapshot(items, ['a', 'b'])
    const afterDelete = items.filter((row) => !['a', 'b'].includes(row.id))
    const restored = restoreRemovedItems(afterDelete, snapshot)
    expect(restored.map((row) => row.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('勾选集合里有数组中不存在的 id 时，快照不会错位', () => {
    const snapshot = buildRemovalSnapshot(items, ['b', 'does-not-exist'])
    expect(snapshot.positions).toEqual([1])
    expect(snapshot.items.map((row) => row.id)).toEqual(['b'])
  })

  it('空快照返回原数组引用，不触发无意义重渲染', () => {
    const afterDelete = [item('a', 100)]
    expect(restoreRemovedItems(afterDelete, null)).toBe(afterDelete)
    expect(restoreRemovedItems(afterDelete, { positions: [], items: [] })).toBe(
      afterDelete,
    )
  })

  it('重复撤销同一快照不会产生重复行（按 id 幂等）', () => {
    const snapshot = buildRemovalSnapshot(items, ['b'])
    const afterDelete = items.filter((row) => row.id !== 'b')
    const once = restoreRemovedItems(afterDelete, snapshot)
    expect(once.map((row) => row.id)).toEqual(['a', 'b', 'c', 'd'])

    // toast 上的「撤销」是普通按钮：双击 / 严格模式重复调用都不能落出两行同 key 明细。
    const twice = restoreRemovedItems(once, snapshot)
    expect(twice.map((row) => row.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
