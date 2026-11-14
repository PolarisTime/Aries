import type { CollabAwareness, CollabAwarenessState } from './collab-provider'

/**
 * Awareness（在线名单 / 光标）的读模型。
 *
 * <p>Awareness 的 state 是 `Record<string, unknown>`：谁都能往里塞字段。这里只认两个
 * 字段并做严格归一化，**组件与 hook 不再自己解析**（避免两处对"名字缺省叫什么"的理解不同）：</p>
 *
 * ```ts
 * { user: { id, name, color }, cursor: { cellKey } | null }
 * ```
 */

/** 一个协作用户（同一个人在多张价格表里 id 相同）。 */
export type CollabUser = {
  id: string
  name: string
  color: string
}

/** 光标位置：只记格键；属于哪张价格表由 {@link CollabPeer.listId} 表达。 */
export type CollabCursor = {
  cellKey: string
}

/** 一个远端在线用户（含他此刻的光标）。 */
export type CollabPeer = {
  clientId: number
  /** 这张 awareness 所属的价格表（一个房间 = 一张表）。 */
  listId: string
  user: CollabUser
  cursor: CollabCursor | null
}

/** 远端有人改了某一格（冲突提示用）。 */
export type CollabPeerEdit = {
  listId: string
  cellKey: string
  price: number | null
  /** 毫秒时间戳（便于界面去重/节流）。 */
  at: number
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** 从一条 awareness state 里读出用户；字段不全就视为无效（不渲染半个头像）。 */
export function readCollabUser(state: unknown): CollabUser | null {
  const source = asRecord(state)
  const user = asRecord(source?.user)
  if (!user) return null
  const id = asText(user.id).trim()
  const name = asText(user.name).trim()
  if (!name) return null
  return {
    id: id || name,
    name,
    color: asText(user.color) || '#1677ff',
  }
}

/** 从一条 awareness state 里读出光标；没有/格式不对 → null。 */
export function readCollabCursor(state: unknown): CollabCursor | null {
  const cursor = asRecord(asRecord(state)?.cursor)
  const cellKey = asText(cursor?.cellKey)
  return cellKey ? { cellKey } : null
}

/**
 * 把一份 Awareness 的 states 转成远端名单（**排除自己**）。
 *
 * <p>`localClientId` 一定是自己：自己的光标用浏览器原生焦点表达，不需要再画一圈描边。</p>
 */
export function readCollabPeers(args: {
  states: Map<number, CollabAwarenessState>
  localClientId: number
  listId: string
}): CollabPeer[] {
  const peers: CollabPeer[] = []
  for (const [clientId, state] of args.states) {
    if (clientId === args.localClientId) continue
    const user = readCollabUser(state)
    if (!user) continue
    peers.push({
      clientId,
      listId: args.listId,
      user,
      cursor: readCollabCursor(state),
    })
  }
  return peers
}

/** 某个格子上的远端光标（同一格可能多人同时停留）。 */
export function peersOfCell(
  peers: readonly CollabPeer[],
  listId: string,
  cellKey: string,
): CollabPeer[] {
  return peers.filter(
    (peer) => peer.listId === listId && peer.cursor?.cellKey === cellKey,
  )
}

/**
 * 在线人数按**人**去重：同一个用户可能同时在多张价格表里（多份 awareness），
 * 名单里只应出现一次。
 */
export function uniquePeerUsers(peers: readonly CollabPeer[]): CollabUser[] {
  const seen = new Set<string>()
  const users: CollabUser[] = []
  for (const peer of peers) {
    if (seen.has(peer.user.id)) continue
    seen.add(peer.user.id)
    users.push(peer.user)
  }
  return users
}

/** 写入自己的用户信息（每个房间连接建立时调用一次）。 */
export function publishCollabUser(
  awareness: CollabAwareness,
  user: CollabUser,
): void {
  awareness.setLocalStateField('user', user)
  // 光标初始为空：连上但还没点任何格子，不要给对方画一个假光标
  awareness.setLocalStateField('cursor', null)
}

/** 上报自己的光标（`null` = 离开格子）。 */
export function publishCollabCursor(
  awareness: CollabAwareness,
  cellKey: string | null,
): void {
  awareness.setLocalStateField('cursor', cellKey ? { cellKey } : null)
}
