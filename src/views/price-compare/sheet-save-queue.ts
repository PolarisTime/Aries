/**
 * 单据保存队列与保存状态推导。
 *
 * <p>从 `useSheetsStore` 抽出的独立职责：串行队列、去抖间隔、保存状态优先级。
 * 全是纯函数/纯数据结构，不依赖 React，可直接单测。</p>
 */

/** 防抖保存间隔(毫秒)。 */
export const SAVE_DEBOUNCE_MS = 800

/** 单据保存的串行队列键前缀: runSerialized 据此识别在途保存属于哪张单据。 */
export const SHEET_SAVE_KEY_PREFIX = 'sheet:'

/** 从串行队列键解析单据 id; 非单据键(如 `config:`)返回 null。 */
export function sheetIdOfSaveKey(key: string): string | null {
  return key.startsWith(SHEET_SAVE_KEY_PREFIX)
    ? key.slice(SHEET_SAVE_KEY_PREFIX.length)
    : null
}

/**
 * 同一资源串行执行: 在飞行中则排队一次, 结束后补跑。
 *
 * <p>「排队一次」是刻意的：同一资源在写入途时再多的保存请求最终都会读到同一份
 * 最新本地状态（任务闭包在真正执行时才读 `stateRef`），重复排队没有意义，还会放大写压力。
 * 补跑复用同一任务闭包，因此「补跑的是最新任务」= 该闭包执行时读到的最新状态。</p>
 */
export async function runSerializedTask(
  inflight: Set<string>,
  pending: Set<string>,
  key: string,
  task: () => Promise<void>,
): Promise<void> {
  if (inflight.has(key)) {
    pending.add(key)
    return
  }
  inflight.add(key)
  try {
    await task()
  } finally {
    inflight.delete(key)
    if (pending.delete(key)) {
      void runSerializedTask(inflight, pending, key, task)
    }
  }
}

/** 单据保存结论(本会话最近一次保存的结果)。 */
export type SaveOutcome = 'saving' | 'saved' | 'error' | 'conflict'

/**
 * 单据保存状态:
 * - `idle` 无改动且本会话无保存结论; `dirty` 有改动待落库;
 * - `saving` 写请求在途; `saved` 已落库; `error` 保存失败可重试;
 * - `conflict` 版本/锁冲突, 交由冲突弹窗或编辑锁横幅处理。
 */
export type SheetSaveStatus =
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'error'
  | 'conflict'

/**
 * 由保存结论与未保存集合推导单据保存状态。
 *
 * <p>优先级: 在途 > 冲突 > 失败 > 新的未落库改动 > 已保存 > 无变化。
 * 未保存集合必须覆盖防抖窗口内的瞬时编辑，否则「刚输入就关标签」会显示已保存。</p>
 */
export function deriveSaveStatus(
  outcome: SaveOutcome | undefined,
  unsaved: ReadonlySet<string>,
  activeId: string,
): SheetSaveStatus {
  if (outcome === 'saving') return 'saving'
  if (outcome === 'conflict') return 'conflict'
  if (outcome === 'error') return 'error'
  if (unsaved.has(activeId)) return 'dirty'
  if (outcome === 'saved') return 'saved'
  return 'idle'
}
