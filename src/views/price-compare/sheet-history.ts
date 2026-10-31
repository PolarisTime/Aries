import type { PriceSheet, ProjectConfig } from './types'

/**
 * 本地快照与撤销/重做历史。
 *
 * <p>从 `useSheetsStore` 抽出的独立职责：只处理「历史栈」这一件事，
 * 不含任何 React 状态、网络或弹窗逻辑，便于直接单测。</p>
 */

/** 撤销/重做历史上限(快照数)。 */
export const HISTORY_LIMIT = 50

/** 同一 coalesceKey 的连续编辑在该窗口内合并为一条历史。 */
export const COALESCE_MS = 800

/** 本地快照: 单据列表 + 激活项 + 项目级配置。 */
export type SheetSnapshot = {
  sheets: PriceSheet[]
  activeId: string
  /** 项目级配置: projectId -> 配置 */
  configs: Record<string, ProjectConfig>
}

/** 撤销/重做历史栈。 */
export type SheetHistory = {
  past: SheetSnapshot[]
  future: SheetSnapshot[]
  /** 上一条历史的合并键(空串表示不合并)。 */
  lastKey: string
  /** 上一条历史的记录时刻(毫秒)。 */
  lastTime: number
}

export function createSheetHistory(): SheetHistory {
  return { past: [], future: [], lastKey: '', lastTime: 0 }
}

/** 是否应把本次提交合并进上一条历史(同一 coalesceKey 且在合并窗口内)。 */
export function shouldCoalesceHistory(
  history: SheetHistory,
  coalesceKey: string | undefined,
  now: number,
): boolean {
  return (
    Boolean(coalesceKey) &&
    coalesceKey === history.lastKey &&
    now - history.lastTime < COALESCE_MS
  )
}

/**
 * 记录一次提交。
 *
 * <p>需要新条目时把 `current` 压入 `past` 并清空 `future`；合并窗口内则跳过压栈，
 * 让同一批连续编辑(如逐字输入)只占一条历史。</p>
 *
 * @return 是否新增了历史条目(调用方据此把深度同步到 state)
 */
export function recordHistoryCommit(
  history: SheetHistory,
  current: SheetSnapshot,
  coalesceKey: string | undefined,
  now: number,
): boolean {
  const coalesce = shouldCoalesceHistory(history, coalesceKey, now)
  if (!coalesce) {
    history.past = [...history.past.slice(-(HISTORY_LIMIT - 1)), current]
    history.future = []
  }
  history.lastKey = coalesceKey ?? ''
  history.lastTime = now
  return !coalesce
}

/**
 * 取上一条撤销目标并推进历史栈。
 *
 * @param current 撤销前的当前快照(进入 future，供重做)
 * @return 目标快照；无历史时返回 undefined 且不改动历史
 */
export function takeUndoSnapshot(
  history: SheetHistory,
  current: SheetSnapshot,
): SheetSnapshot | undefined {
  if (!history.past.length) return undefined
  const target = history.past[history.past.length - 1]
  history.past = history.past.slice(0, -1)
  history.future = [current, ...history.future].slice(0, HISTORY_LIMIT)
  history.lastKey = ''
  return target
}

/**
 * 取重做目标并推进历史栈。
 *
 * @param current 重做前的当前快照(回到 past，供再次撤销)
 * @return 目标快照；无重做项时返回 undefined 且不改动历史
 */
export function takeRedoSnapshot(
  history: SheetHistory,
  current: SheetSnapshot,
): SheetSnapshot | undefined {
  if (!history.future.length) return undefined
  const target = history.future[0]
  history.future = history.future.slice(1)
  history.past = [...history.past.slice(-(HISTORY_LIMIT - 1)), current]
  history.lastKey = ''
  return target
}

/**
 * 当前激活单据是否锁定了规格和数量。
 *
 * <p>锁定期间撤销/重做会回退规格/吨位，被后端 422 拒绝后本地与服务端不一致，
 * 因此该判断是撤销/重做可用性的唯一出口。</p>
 */
export function isSpecQuantityLocked(snapshot: SheetSnapshot): boolean {
  const activeSheet = snapshot.sheets.find(
    (sheet) => sheet.id === snapshot.activeId,
  )
  return Boolean(activeSheet?.specQuantityLocked)
}
