import { create } from 'zustand'
import type { NetPriceMatchEntry } from './net-price-fill'

/**
 * 网价匹配核查结果的**页面级快照**。
 *
 * <p>为什么不把匹配状态写进明细行: 明细行数组由编辑器持有, 任何写入都会被当成"单据有未保存
 * 改动"(关闭页签/刷新前的未保存拦截会因此误报)。匹配状态是纯展示态, 放到这份轻量 store 里,
 * 由行内标识(`NetPriceMatchChip`)按行 id 订阅, 既不污染保存载荷也不弄脏单据。</p>
 *
 * <p><b>为什么按单据登记行 id 而不是只存一个 documentKey</b>: 列表行的「+」展开可以同时展开
 * 多张单据的内联详情, 只读详情面也会各自发起核查。如果 store 只保留"最近一次核查的那张单",
 * 展开第二张单就会把第一张单的结果整片抹掉(行内标识退回「未核查」)。因此条目按行 id 平铺
 * (雪花行 id 全局唯一), 另用 `documents` 记录"这张单写过哪些行", 用于按单据替换/清理。</p>
 */

/** 单张单据的核查进度: 进行中 / 已完成 / 失败。 */
export type NetPriceMatchCheckStatus = 'checking' | 'done' | 'error'

export interface NetPriceDocumentState {
  /** 该单据本次写入的行 id(用于重置这张单的结果, 不动其它单据)。 */
  itemIds: string[]
  /** 核查口径指纹(取价日/时段/规则/数据源/行内容); 相同则无需重复核查。 */
  contextKey: string
  status: NetPriceMatchCheckStatus
  /** 失败原因(status === 'error' 时有值)。 */
  error?: string
}

interface NetPriceMatchStoreState {
  /** 行 id → 匹配结果(可同时承载多张单据)。 */
  entries: Record<string, NetPriceMatchEntry>
  /** 单据键 → 该单据的核查状态。 */
  documents: Record<string, NetPriceDocumentState>
  /** 最近一次核查完成时间(毫秒), 从未完成为 null。 */
  checkedAt: number | null
  /** 标记某张单据开始核查(进入 loading, 便于行内标识区分"核查中"与"没核查")。 */
  beginCheck: (
    documentKey: string,
    contextKey: string,
    itemIds: readonly string[],
  ) => void
  /** 写入某张单据的核查结果: 只替换该单据的条目, 其它单据保持不变。 */
  setResult: (
    documentKey: string,
    entries: Record<string, NetPriceMatchEntry>,
    contextKey?: string,
  ) => void
  /** 记录某张单据核查失败(保留失败原因, 行内标识仍按「未核查」展示)。 */
  failCheck: (documentKey: string, message: string) => void
  /** 该单据是否已按同一口径核查过(避免重复展开时重复请求)。 */
  hasResult: (documentKey: string, contextKey: string) => boolean
  /** 清掉某张单据的结果(切换/离开单据时), 不影响同时展开的其它单据。 */
  clearDocument: (documentKey: string) => void
  clear: () => void
}

/** 从 entries 中摘掉指定行 id(某张单据的旧条目), 不重建其它条目对象。 */
function withoutItemIds(
  entries: Record<string, NetPriceMatchEntry>,
  itemIds: readonly string[],
): Record<string, NetPriceMatchEntry> {
  if (itemIds.length === 0) return entries
  const droppedIds = new Set(itemIds)
  let changed = false
  const next: Record<string, NetPriceMatchEntry> = {}
  for (const [itemId, entry] of Object.entries(entries)) {
    if (droppedIds.has(itemId)) {
      changed = true
      continue
    }
    next[itemId] = entry
  }
  return changed ? next : entries
}

export const useNetPriceMatchStore = create<NetPriceMatchStoreState>(
  (set, get) => ({
    entries: {},
    documents: {},
    checkedAt: null,
    beginCheck: (documentKey, contextKey, itemIds) =>
      set((state) => ({
        documents: {
          ...state.documents,
          [documentKey]: {
            itemIds: [...itemIds],
            contextKey,
            status: 'checking',
          },
        },
      })),
    setResult: (documentKey, entries, contextKey) =>
      set((state) => {
        const previousIds = state.documents[documentKey]?.itemIds ?? []
        const itemIds = Object.keys(entries)
        return {
          entries: {
            ...withoutItemIds(state.entries, previousIds),
            ...entries,
          },
          documents: {
            ...state.documents,
            [documentKey]: {
              itemIds,
              contextKey:
                contextKey ?? state.documents[documentKey]?.contextKey ?? '',
              status: 'done',
            },
          },
          checkedAt: Date.now(),
        }
      }),
    failCheck: (documentKey, message) =>
      set((state) => ({
        documents: {
          ...state.documents,
          [documentKey]: {
            itemIds: state.documents[documentKey]?.itemIds ?? [],
            contextKey: state.documents[documentKey]?.contextKey ?? '',
            status: 'error',
            error: message,
          },
        },
      })),
    hasResult: (documentKey, contextKey) => {
      const document = get().documents[documentKey]
      return Boolean(
        document &&
          document.status === 'done' &&
          document.contextKey === contextKey &&
          document.itemIds.length > 0,
      )
    },
    clearDocument: (documentKey) =>
      set((state) => {
        const previousIds = state.documents[documentKey]?.itemIds ?? []
        if (!state.documents[documentKey]) return state
        const documents = { ...state.documents }
        delete documents[documentKey]
        return {
          entries: withoutItemIds(state.entries, previousIds),
          documents,
        }
      }),
    clear: () => set({ entries: {}, documents: {}, checkedAt: null }),
  }),
)
