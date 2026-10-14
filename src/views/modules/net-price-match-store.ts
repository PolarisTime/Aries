import { create } from 'zustand'
import type { NetPriceMatchEntry } from './net-price-fill'

/**
 * 网价匹配核查结果的**页面级快照**。
 *
 * <p>为什么不把匹配状态写进明细行: 明细行数组由编辑器持有, 任何写入都会被当成"单据有未保存
 * 改动"(关闭页签/刷新前的未保存拦截会因此误报)。匹配状态是纯展示态, 放到这份轻量 store 里,
 * 由行内标识(`NetPriceMatchChip`)按行 id 订阅, 既不污染保存载荷也不弄脏单据。</p>
 *
 * <p>`documentKey` 只用于提示调用方"这是哪张单据的核查结果"; 行内标识按行 id 读取, 因此切换
 * 单据时必须 `clear()`(由取价组件的生命周期负责), 避免上一张单据的状态串到下一张。</p>
 */
interface NetPriceMatchStoreState {
  /** 本次核查对应的单据键(销售订单 id)。 */
  documentKey: string
  /** 行 id → 匹配结果。 */
  entries: Record<string, NetPriceMatchEntry>
  /** 最近一次核查时间(毫秒), 未核查为 null。 */
  checkedAt: number | null
  setResult: (
    documentKey: string,
    entries: Record<string, NetPriceMatchEntry>,
  ) => void
  clear: () => void
}

export const useNetPriceMatchStore = create<NetPriceMatchStoreState>((set) => ({
  documentKey: '',
  entries: {},
  checkedAt: null,
  setResult: (documentKey, entries) =>
    set({ documentKey, entries, checkedAt: Date.now() }),
  clear: () => set({ documentKey: '', entries: {}, checkedAt: null }),
}))

/** 只读某张单据的核查快照(单据不匹配时返回空结果, 避免串单)。 */
export function readNetPriceMatchEntries(
  documentKey: string,
): Record<string, NetPriceMatchEntry> {
  const state = useNetPriceMatchStore.getState()
  return state.documentKey === documentKey ? state.entries : {}
}
