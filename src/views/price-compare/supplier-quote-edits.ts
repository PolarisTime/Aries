import type {
  BrandDraft,
  ColumnSavePlan,
  ServerCell,
} from './supplier-price-list-model'
import { quoteRowKey, setDraftPrice } from './supplier-price-list-model'

/** 草稿集合：品牌 → 该列的草稿（与页面状态同构，可直接序列化）。 */
export type DraftMap = Record<string, BrandDraft>

/** 单格改动记录：记录改前与改后的绝对有效值，自动保存清空草稿后仍能精准回滚/重做。 */
export type QuoteCellEdit = {
  brandName: string
  rowKey: string
  before: number | null
  after: number | null
}

/** 一次用户操作在统一时间线上的记录（同一步可同时覆盖 REST 品牌与协作品牌）。 */
export type QuoteHistoryEntry = {
  rest: readonly QuoteCellEdit[]
  collabListIds: readonly string[]
}

export type QuoteEditHistory = {
  past: QuoteHistoryEntry[]
  future: QuoteHistoryEntry[]
}

export const EMPTY_EDIT_HISTORY: QuoteEditHistory = { past: [], future: [] }

/** 历史栈上限：撤销只服务于「刚敲错/粘贴错」，不需要无限历史。 */
const HISTORY_LIMIT = 50

function normalizeRestEdits(edits: readonly QuoteCellEdit[]): QuoteCellEdit[] {
  const byCell = new Map<string, QuoteCellEdit>()
  for (const edit of edits) {
    const key = `${edit.brandName}\u0000${edit.rowKey}`
    const existing = byCell.get(key)
    if (existing) {
      byCell.set(key, { ...existing, after: edit.after })
    } else {
      byCell.set(key, { ...edit })
    }
  }
  const normalized: QuoteCellEdit[] = []
  for (const edit of byCell.values()) {
    if (edit.before !== edit.after) normalized.push(edit)
  }
  return normalized
}

function normalizeCollabListIds(listIds: readonly string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const listId of listIds) {
    if (!listId || seen.has(listId)) continue
    seen.add(listId)
    normalized.push(listId)
  }
  return normalized
}

/** 有实际改动才入栈：空变化不入栈，也不冲掉重做栈，避免 Ctrl+Z 按了没反应。 */
export function pushEditHistory(
  history: QuoteEditHistory,
  entry: QuoteHistoryEntry,
): QuoteEditHistory {
  const rest = normalizeRestEdits(entry.rest)
  const collabListIds = normalizeCollabListIds(entry.collabListIds)
  if (rest.length === 0 && collabListIds.length === 0) return history
  const past = [...history.past, { rest, collabListIds }].slice(-HISTORY_LIMIT)
  return { past, future: [] }
}

export function popUndoEntry(history: QuoteEditHistory): {
  history: QuoteEditHistory
  entry: QuoteHistoryEntry | null
} {
  const entry = history.past.at(-1)
  if (!entry) return { history, entry: null }
  return {
    history: {
      past: history.past.slice(0, -1),
      future: [entry, ...history.future].slice(0, HISTORY_LIMIT),
    },
    entry,
  }
}

export function popRedoEntry(history: QuoteEditHistory): {
  history: QuoteEditHistory
  entry: QuoteHistoryEntry | null
} {
  const entry = history.future[0]
  if (!entry) return { history, entry: null }
  return {
    history: {
      past: [...history.past, entry].slice(-HISTORY_LIMIT),
      future: history.future.slice(1),
    },
    entry,
  }
}

/**
 * 将一步 REST 改动应用到草稿集合。
 *
 * <p>默认写入目标值（自动保存后草稿已被清掉，必须显式落草稿才能驱动下一次自动保存回写服务端）；
 * 若调用方确认该品牌无在途保存且目标值已与已落库值一致，可通过 `shouldOmit` 直接移除冗余草稿键，
 * 避免无意义的 PUT 或空列创建。</p>
 */
export function applyEditHistoryToDrafts(
  drafts: DraftMap,
  edits: readonly QuoteCellEdit[],
  direction: 'undo' | 'redo',
  options?: {
    shouldOmit?: (
      brandName: string,
      rowKey: string,
      value: number | null,
    ) => boolean
  },
): { drafts: DraftMap; touchedBrands: string[] } {
  const next: DraftMap = { ...drafts }
  const touched = new Set<string>()
  for (const edit of edits) {
    const target = direction === 'undo' ? edit.before : edit.after
    if (options?.shouldOmit?.(edit.brandName, edit.rowKey, target)) {
      const currentBrandDraft = next[edit.brandName]
      if (currentBrandDraft && edit.rowKey in currentBrandDraft) {
        const rest: BrandDraft = { ...currentBrandDraft }
        delete rest[edit.rowKey]
        if (Object.keys(rest).length === 0) delete next[edit.brandName]
        else next[edit.brandName] = rest
      }
    } else {
      next[edit.brandName] = setDraftPrice(
        next[edit.brandName],
        edit.rowKey,
        target,
      )
    }
    touched.add(edit.brandName)
  }
  return { drafts: next, touchedBrands: [...touched] }
}

/**
 * 某些品牌切换进实时协作后，从历史栈里只剔除这些品牌的 REST 改动，
 * 保留其余仍在 REST 模式下的品牌历史以及协作时间线记录。
 */
export function pruneEditHistoryForCollab(
  history: QuoteEditHistory,
  collabBrands: ReadonlySet<string>,
): QuoteEditHistory {
  if (collabBrands.size === 0) return history
  let changed = false
  const pruneList = (
    list: readonly QuoteHistoryEntry[],
  ): QuoteHistoryEntry[] => {
    const next: QuoteHistoryEntry[] = []
    for (const entry of list) {
      if (entry.rest.length === 0) {
        next.push(entry)
        continue
      }
      const remainingRest = entry.rest.filter(
        (edit) => !collabBrands.has(edit.brandName),
      )
      if (remainingRest.length === entry.rest.length) {
        next.push(entry)
        continue
      }
      changed = true
      if (remainingRest.length > 0 || entry.collabListIds.length > 0) {
        next.push({ rest: remainingRest, collabListIds: entry.collabListIds })
      }
    }
    return next
  }
  const past = pruneList(history.past)
  const future = pruneList(history.future)
  return changed ? { past, future } : history
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
