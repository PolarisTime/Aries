import * as Y from 'yjs'
import type {
  CollabAwareness,
  CollabAwarenessState,
  CollabTransport,
  CollabTransportFactory,
  CollabTransportOptions,
  CollabTransportState,
} from './collab-provider'

/**
 * 内存版假传输（**测试与本地无侧车联调用，不连任何网络**）。
 *
 * <p>它实现的东西和真实 Hocuspocus 传输同构：文档 update 双向广播、awareness 状态互见、
 * 连接状态与 `synced` 标志、断线与销毁。区别只是"网络"换成了同一个进程里的
 * {@link FakeCollabServer}，于是：</p>
 *
 * <ul>
 *   <li>单测可以在毫秒级覆盖「两个客户端并发改同一格 → 收敛」；</li>
 *   <li>断线 / 重连 / 鉴权失败这些故障路径可以按需注入，不用真的拔网线。</li>
 * </ul>
 *
 * <p>**不要在生产路径使用**：没有鉴权、没有持久化，只服务于测试与本地调试。</p>
 */

/** 服务端侧的回调面（传输实现内部使用，不导出）。 */
interface FakeClientHooks {
  getRoom(): string
  getDoc(): Y.Doc
  getAwarenessStates(): Map<number, CollabAwarenessState>
  receiveUpdate(update: Uint8Array): void
  receiveAwareness(states: Map<number, CollabAwarenessState>): void
  markDisconnected(): void
  markFailed(): void
  markAuthFailed(): void
}

/** Awareness 的极简实现：只需 `user` / `cursor` 两个字段与变更通知。 */
export class FakeAwareness implements CollabAwareness {
  readonly clientID: number
  private readonly states = new Map<number, CollabAwarenessState>()
  private readonly listeners = new Set<() => void>()

  constructor(clientID: number) {
    this.clientID = clientID
    this.states.set(clientID, {})
  }

  getStates(): Map<number, CollabAwarenessState> {
    return new Map(this.states)
  }

  getLocalState(): CollabAwarenessState | null {
    return this.states.get(this.clientID) ?? null
  }

  setLocalStateField(field: string, value: unknown): void {
    const current = this.states.get(this.clientID) ?? {}
    this.states.set(this.clientID, { ...current, [field]: value })
    this.emit()
  }

  /** 远端客户端状态快照（服务端广播进来）。 */
  applyRemoteStates(states: Map<number, CollabAwarenessState>): void {
    let changed = false
    for (const [clientId, state] of states) {
      if (clientId === this.clientID) continue
      this.states.set(clientId, state)
      changed = true
    }
    if (changed) this.emit()
  }

  /** 某个客户端下线，清掉它的状态。 */
  removeRemote(clientId: number): void {
    if (this.states.delete(clientId)) this.emit()
  }

  on(_event: 'update' | 'change', listener: () => void): void {
    this.listeners.add(listener)
  }

  off(_event: 'update' | 'change', listener: () => void): void {
    this.listeners.delete(listener)
  }

  private emit() {
    for (const listener of this.listeners) listener()
  }
}

/** 内存协作服务端：把一台"边车"简化成进程内广播总线。 */
export class FakeCollabServer {
  private readonly clients = new Set<FakeClientHooks>()
  private offline = false

  /** 当前房间内的连接数（测试用来确认销毁确实断开了连接）。 */
  get clientCount(): number {
    return this.clients.size
  }

  /** 模拟网络断开：之后建立的连接直接进入 `failed`。 */
  setOffline(offline: boolean): void {
    this.offline = offline
    if (offline) this.dropConnections()
  }

  /** 模拟断线：所有已连接传输转成 `disconnected`（客户端可自行重连）。 */
  dropConnections(): void {
    for (const client of this.clients) client.markDisconnected()
    this.clients.clear()
  }

  /** 模拟鉴权失败（票据过期/无房间权限）：连接被拒绝。 */
  rejectAuthentication(): void {
    for (const client of this.clients) client.markAuthFailed()
    this.clients.clear()
  }

  /**
   * 加入房间；离线时拒绝。返回是否加入成功。
   *
   * <p>加入时与房间内每个客户端**互相补齐缺失的增量**（按状态向量取差集）——
   * 这是真实 provider 重连时的握手行为，没有它，断线期间的改动在重连后永远传不过去。</p>
   */
  join(client: FakeClientHooks): boolean {
    if (this.offline) {
      client.markFailed()
      return false
    }
    const room = client.getRoom()
    for (const existing of this.clients) {
      if (existing.getRoom() !== room) continue
      existing.receiveUpdate(
        Y.encodeStateAsUpdate(
          client.getDoc(),
          Y.encodeStateVector(existing.getDoc()),
        ),
      )
      client.receiveUpdate(
        Y.encodeStateAsUpdate(
          existing.getDoc(),
          Y.encodeStateVector(client.getDoc()),
        ),
      )
      // 新人要看到房里已有的人；已有的人也已通过自己的 awareness 广播看到新人
      client.receiveAwareness(existing.getAwarenessStates())
    }
    this.clients.add(client)
    return true
  }

  leave(client: FakeClientHooks): void {
    this.clients.delete(client)
  }

  /** 文档更新广播给同房间内其他客户端。 */
  broadcastUpdate(from: FakeClientHooks, update: Uint8Array): void {
    const room = from.getRoom()
    for (const client of this.clients) {
      if (client === from || client.getRoom() !== room) continue
      client.receiveUpdate(update)
    }
  }

  /** awareness 状态广播：把发送方的完整状态快照推给同房间其他人。 */
  broadcastAwareness(
    from: FakeClientHooks,
    states: Map<number, CollabAwarenessState>,
  ): void {
    const room = from.getRoom()
    for (const client of this.clients) {
      if (client === from || client.getRoom() !== room) continue
      client.receiveAwareness(states)
    }
  }
}

let nextClientId = 1

/** 假传输：把 Y.Doc update 与 awareness 变化接到 {@link FakeCollabServer}。 */
class FakeTransport implements CollabTransport, FakeClientHooks {
  readonly doc: Y.Doc
  readonly awareness: FakeAwareness
  private readonly listeners = new Set<() => void>()
  private readonly server: FakeCollabServer
  private readonly room: string
  private currentState: CollabTransportState = 'connecting'
  private currentSynced = false
  private attached = false
  private destroyed = false
  /** 正在应用远端 awareness：此时的变化不能再广播回去，否则两端无限回环。 */
  private applyingRemoteAwareness = false
  private readonly updateHandler: (update: Uint8Array, origin: unknown) => void
  private readonly awarenessHandler = () => {
    if (this.applyingRemoteAwareness) return
    this.server.broadcastAwareness(this, this.awareness.getStates())
  }

  constructor(server: FakeCollabServer, options: CollabTransportOptions) {
    this.server = server
    this.room = options.room
    this.doc = options.doc
    this.awareness = new FakeAwareness(nextClientId++)
    this.updateHandler = (update, origin) => {
      // 回放远端 update 时不要再广播，避免回声
      if (origin === this) return
      this.server.broadcastUpdate(this, update)
    }
  }

  get state(): CollabTransportState {
    return this.currentState
  }

  get synced(): boolean {
    return this.currentSynced
  }

  connect(): void {
    if (this.destroyed) return
    if (this.attached) return
    this.currentState = 'connecting'
    this.notify()
    if (!this.server.join(this)) return
    this.attached = true
    this.doc.on('update', this.updateHandler)
    this.awareness.on('change', this.awarenessHandler)
    this.currentState = 'connected'
    this.currentSynced = true
    this.notify()
    // 连上就把本地 awareness 广播一次，对方立刻看到我
    this.awarenessHandler()
  }

  disconnect(): void {
    if (!this.attached) return
    this.detach()
    this.server.leave(this)
    this.currentState = 'disconnected'
    this.currentSynced = false
    this.notify()
  }

  destroy(): void {
    if (this.destroyed) return
    this.disconnect()
    this.destroyed = true
    this.listeners.clear()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getRoom(): string {
    return this.room
  }

  getDoc(): Y.Doc {
    return this.doc
  }

  getAwarenessStates(): Map<number, CollabAwarenessState> {
    return this.awareness.getStates()
  }

  receiveUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update, this)
  }

  receiveAwareness(states: Map<number, CollabAwarenessState>): void {
    this.applyingRemoteAwareness = true
    try {
      this.awareness.applyRemoteStates(states)
    } finally {
      this.applyingRemoteAwareness = false
    }
  }

  markDisconnected(): void {
    this.detach()
    this.currentState = 'disconnected'
    this.currentSynced = false
    this.notify()
  }

  markFailed(): void {
    this.currentState = 'failed'
    this.currentSynced = false
    this.notify()
  }

  markAuthFailed(): void {
    this.currentState = 'authentication-failed'
    this.currentSynced = false
    this.notify()
  }

  /** 房间名（测试里用来确认工厂收到的是服务端下发的 room）。 */
  get roomName(): string {
    return this.room
  }

  private detach() {
    if (!this.attached) return
    this.attached = false
    this.doc.off('update', this.updateHandler)
    this.awareness.off('change', this.awarenessHandler)
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }
}

/** 创建一个共享内存服务端的假传输工厂（多个客户端共用同一个 server 才能互见）。 */
export function createFakeTransportFactory(
  server: FakeCollabServer,
): CollabTransportFactory {
  return (options) => new FakeTransport(server, options)
}

/** 常用组合：一个假服务端 + 对应工厂。 */
export function createFakeCollabNetwork(): {
  server: FakeCollabServer
  createTransport: CollabTransportFactory
} {
  const server = new FakeCollabServer()
  return { server, createTransport: createFakeTransportFactory(server) }
}
