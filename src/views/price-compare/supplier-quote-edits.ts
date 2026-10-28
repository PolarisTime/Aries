import type {
  BrandDraft,
  ColumnSavePlan,
  ServerCell,
} from './supplier-price-list-model'
import { quoteRowKey } from './supplier-price-list-model'

/** 草稿集合：品牌 → 该列的草稿（与页面状态同构，可直接序列化）。 */
export type DraftMap = Record<string, BrandDraft>

export type DraftHistory = {
  past: DraftMap[]
  future: DraftMap[]
}

export const EMPTY_HISTORY: DraftHistory = { past: [], future: [] }

/** 历史栈上限：撤销只服务于「刚敲错/粘贴错」，不需要无限历史。 */
const HISTORY_LIMIT = 50

/** 有改动才入栈：空变化不入栈，避免 Ctrl+Z 按了没反应。 */
export function pushHistory(
  history: DraftHistory,
  previous: DraftMap,
): DraftHistory {
  const past = [...history.past, previous].slice(-HISTORY_LIMIT)
  return { past, future: [] }
}

export function undoDrafts(
  history: DraftHistory,
  current: DraftMap,
): { history: DraftHistory; drafts: DraftMap } {
  const previous = history.past.at(-1)
  if (!previous) return { history, drafts: current }
  return {
    history: {
      past: history.past.slice(0, -1),
      future: [current, ...history.future].slice(0, HISTORY_LIMIT),
    },
    drafts: previous,
  }
}

export function redoDrafts(
  history: DraftHistory,
  current: DraftMap,
): { history: DraftHistory; drafts: DraftMap } {
  const next = history.future[0]
  if (!next) return { history, drafts: current }
  return {
    history: {
      past: [...history.past, current].slice(-HISTORY_LIMIT),
      future: history.future.slice(1),
    },
    drafts: next,
  }
}

/** 草稿集合是否有任何改动（空对象 = 无改动）。 */
export function draftMapDirty(drafts: DraftMap): boolean {
  return Object.values(drafts).some((draft) => Object.keys(draft).length > 0)
}

/** 解析本地保存的草稿；脏数据退化为空，绝不让页面打不开。 */
export function parseDrafts(raw: string | null): DraftMap {
  if (!raw) return {}
  try {
    const value = JSON.parse(raw) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const drafts: DraftMap = {}
    for (const [brand, cells] of Object.entries(value)) {
      if (!cells || typeof cells !== 'object' || Array.isArray(cells)) continue
      const draft: BrandDraft = {}
      for (const [rowKey, price] of Object.entries(cells)) {
        if (price === null) draft[rowKey] = null
        else if (typeof price === 'number' && Number.isFinite(price)) {
          draft[rowKey] = price
        }
      }
      drafts[brand] = draft
    }
    return drafts
  } catch {
    return {}
  }
}

export function serializeDrafts(drafts: DraftMap): string {
  return JSON.stringify(drafts)
}

/** 保存前的差异统计：新增 / 改价 / 取消（清空）各多少条。 */
export type SaveDiff = {
  added: number
  changed: number
  removed: number
  brands: number
}

export function diffSavePlans(
  plans: readonly ColumnSavePlan[],
  serverCellsOfBrand: (brandName: string) => ReadonlyMap<string, ServerCell>,
): SaveDiff {
  let added = 0
  let changed = 0
  let removed = 0

  for (const plan of plans) {
    const server = serverCellsOfBrand(plan.brandName)
    const submitted = new Set<string>()
    for (const item of plan.items) {
      const rowKey = quoteRowKey(item)
      submitted.add(rowKey)
      const existing = server.get(rowKey)?.price
      if (existing === undefined) added += 1
      else if (existing !== item.price) changed += 1
    }
    for (const rowKey of server.keys()) {
      if (!submitted.has(rowKey)) removed += 1
    }
  }

  return { added, changed, removed, brands: plans.length }
}

/** 粘贴预检：有多少格会覆盖已有值（服务端或本次草稿）。 */
export function countOverwrites(args: {
  cells: readonly { brandName: string; rowKey: string; value: number | null }[]
  drafts: DraftMap
  serverCellsOfBrand: (brandName: string) => ReadonlyMap<string, ServerCell>
}): number {
  return args.cells.filter((cell) => {
    const fromDraft = args.drafts[cell.brandName]?.[cell.rowKey]
    if (fromDraft !== undefined && fromDraft !== null) return true
    return (
      args.serverCellsOfBrand(cell.brandName).get(cell.rowKey) !== undefined
    )
  }).length
}
