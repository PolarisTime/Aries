import { beforeEach, describe, expect, it } from 'vitest'
import { useNetPriceMatchStore } from './net-price-match-store'

/**
 * 页面级网价快照的**多单据**契约。
 *
 * <p>真实场景: 列表行的「+」可以同时展开多张单据的内联详情, 详情弹窗也可能与某一行的展开
 * 并存。旧实现只保存"最近一次核查的那张单"(单个 documentKey + 整份 entries 替换), 展开
 * 第二张单会把第一张单的结果整片抹掉 —— 行内标识静默退回「未核查」。这里用两份单据的数据
 * 锁定"互不覆盖"的契约。</p>
 */
describe('useNetPriceMatchStore', () => {
  beforeEach(() => {
    useNetPriceMatchStore.getState().clear()
  })

  it('两张单据的核查结果互不覆盖(行 id 平铺, 按单据登记归属)', () => {
    const store = useNetPriceMatchStore.getState()
    store.setResult('order-a', {
      a1: { state: 'MATCHED', expectedPrice: 3200, currentPrice: 3200 },
    })
    store.setResult('order-b', {
      b1: { state: 'NO_PRICE' },
    })

    const state = useNetPriceMatchStore.getState()
    expect(state.entries.a1?.state).toBe('MATCHED')
    expect(state.entries.b1?.state).toBe('NO_PRICE')
    expect(state.documents['order-a']?.itemIds).toEqual(['a1'])
    expect(state.documents['order-b']?.itemIds).toEqual(['b1'])
  })

  it('同一张单据再次核查只替换自己的条目(旧行被清掉, 别的单据不动)', () => {
    const store = useNetPriceMatchStore.getState()
    store.setResult('order-a', {
      a1: { state: 'MATCHED' },
      a2: { state: 'MISMATCH', expectedPrice: 1, currentPrice: 2 },
    })
    store.setResult('order-b', { b1: { state: 'MATCHED' } })
    // 单据 A 的明细行变了: 只剩 a2 且结论不同
    store.setResult('order-a', { a2: { state: 'MATCHED' } })

    const state = useNetPriceMatchStore.getState()
    expect(state.entries.a1).toBeUndefined()
    expect(state.entries.a2?.state).toBe('MATCHED')
    expect(state.entries.b1?.state).toBe('MATCHED')
    expect(state.documents['order-a']?.itemIds).toEqual(['a2'])
  })

  it('清理某张单据不影响同时展开的其它单据', () => {
    const store = useNetPriceMatchStore.getState()
    store.setResult('order-a', { a1: { state: 'MATCHED' } })
    store.setResult('order-b', { b1: { state: 'MATCHED' } })

    useNetPriceMatchStore.getState().clearDocument('order-a')

    const state = useNetPriceMatchStore.getState()
    expect(state.entries.a1).toBeUndefined()
    expect(state.documents['order-a']).toBeUndefined()
    expect(state.entries.b1?.state).toBe('MATCHED')
  })

  it('核查中 / 失败时保留行 id, 便于行内标识定位到所属单据并说明原因', () => {
    const store = useNetPriceMatchStore.getState()
    store.beginCheck('order-a', 'ctx-1', ['a1', 'a2'])
    expect(useNetPriceMatchStore.getState().documents['order-a']).toMatchObject(
      {
        itemIds: ['a1', 'a2'],
        contextKey: 'ctx-1',
        status: 'checking',
      },
    )

    useNetPriceMatchStore.getState().failCheck('order-a', '无行情')
    expect(useNetPriceMatchStore.getState().documents['order-a']).toMatchObject(
      {
        itemIds: ['a1', 'a2'],
        status: 'error',
        error: '无行情',
      },
    )
    // 失败不写条目: 行内标识仍按「未核查」展示, 不伪造结论
    expect(useNetPriceMatchStore.getState().entries).toEqual({})
  })

  it('hasResult 只在同一口径且已成功时命中(失败/换口径都要重查)', () => {
    const store = useNetPriceMatchStore.getState()
    store.beginCheck('order-a', 'ctx-1', ['a1'])
    expect(useNetPriceMatchStore.getState().hasResult('order-a', 'ctx-1')).toBe(
      false,
    )

    useNetPriceMatchStore
      .getState()
      .setResult('order-a', { a1: { state: 'MATCHED' } }, 'ctx-1')
    expect(useNetPriceMatchStore.getState().hasResult('order-a', 'ctx-1')).toBe(
      true,
    )
    expect(useNetPriceMatchStore.getState().hasResult('order-a', 'ctx-2')).toBe(
      false,
    )

    useNetPriceMatchStore.getState().failCheck('order-a', '超时')
    expect(useNetPriceMatchStore.getState().hasResult('order-a', 'ctx-1')).toBe(
      false,
    )
  })
})
