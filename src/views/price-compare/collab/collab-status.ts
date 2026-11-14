/**
 * 协作连接状态 → UI 口径。
 *
 * <p>状态机只有一处（本文件）：徽标文案、颜色、是否"已回退 REST"都从这里读，
 * 组件与 hook 不各写一份映射（同一口径只在一处实现）。</p>
 */

/** 单个房间（一张价格表）的连接状态。 */
export type CollabEntryState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'auth-failed'

/** 页面上聚合后的协作状态。 */
export type CollabConnectionState =
  | 'disabled'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'auth-failed'
  | 'unavailable'

/** 徽标语义色（直接对应 antd `Tag` 的 color 语义 / `Badge` 的 status）。 */
export type CollabStatusTone =
  | 'default'
  | 'processing'
  | 'success'
  | 'warning'
  | 'error'

/**
 * 把多张价格表的状态聚合成页面级状态。
 *
 * <p>规则按"用户最需要知道的那件事"排序：鉴权失败 → 全部离线 → 任一连不上（重连/连接中）
 * → 全部已连。只有一个房间时它就是原样。</p>
 *
 * <p>`fallback` 用于「一张表都没连上」的场景（取票据就被拒/网络不可达）：此时没有房间状态，
 * 降级原因由调用方给出，避免这里再猜一遍。</p>
 */
export function summarizeCollabState(
  entries: readonly CollabEntryState[],
  fallback: CollabConnectionState = 'disabled',
): CollabConnectionState {
  if (entries.length === 0) return fallback
  if (entries.every((state) => state === 'connected')) return 'connected'
  if (entries.includes('auth-failed')) return 'auth-failed'
  if (entries.every((state) => state === 'offline')) return 'offline'
  if (
    entries.some((state) => state === 'reconnecting' || state === 'offline')
  ) {
    return 'reconnecting'
  }
  return 'connecting'
}

/** 是否已经回退到 REST 自动保存（降级态）。 */
export function isCollabFallbackState(state: CollabConnectionState): boolean {
  return (
    state === 'offline' ||
    state === 'auth-failed' ||
    state === 'unavailable' ||
    state === 'disabled'
  )
}

/** 徽标文案的 i18n key（`collab.status.*`）。只读态单独一套文案。 */
export function collabStatusLabelKey(
  state: CollabConnectionState,
  writable: boolean,
): string {
  if (state === 'connected' && !writable) return 'collab.status.readonly'
  switch (state) {
    case 'connecting':
      return 'collab.status.connecting'
    case 'connected':
      return 'collab.status.connected'
    case 'reconnecting':
      return 'collab.status.reconnecting'
    case 'offline':
      return 'collab.status.offline'
    case 'auth-failed':
      return 'collab.status.authFailed'
    case 'unavailable':
      return 'collab.status.unavailable'
    default:
      return 'collab.status.disabled'
  }
}

/** 徽标颜色语义。 */
export function collabStatusTone(
  state: CollabConnectionState,
  writable: boolean,
): CollabStatusTone {
  if (state === 'connected') return writable ? 'success' : 'warning'
  if (state === 'connecting' || state === 'reconnecting') return 'processing'
  if (state === 'auth-failed' || state === 'offline') return 'error'
  return 'default'
}

/**
 * 在线人数文案用的口径：**始终包含自己**。
 *
 * <p>设计文档 §9.3 要求无人协作时显示「仅你」，所以 peers 为空 → `onlyYou`，
 * 否则显示人数（含自己）与名单。</p>
 */
export function collabOnlineLabelKey(peerCount: number): string {
  return peerCount === 0 ? 'collab.online.onlyYou' : 'collab.online.label'
}
