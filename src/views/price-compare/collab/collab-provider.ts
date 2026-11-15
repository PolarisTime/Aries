import type * as Y from 'yjs'

/**
 * 协作传输层：把「Hocuspocus provider」收敛成一个可替换的接口。
 *
 * <p>为什么要有这层：生产用 `@hocuspocus/provider`，但**单测不能连真实 WebSocket**
 * （设计文档 §13 的测试口径）。测试注入一个内存假传输即可覆盖「建连 → 同步 → 断线重连 →
 * 销毁」全部生命周期；页面代码只依赖本接口，换传输不牵连业务。</p>
 *
 * <p>`@hocuspocus/provider` 走**动态 import**（{@link loadHocuspocusTransportFactory}）：
 * 它连同 `yjs` 约几十 KB gzip，只在协作真正开启时才加载，不进价格表路由的首屏包
 * （设计文档 §15「前端包体增加」对策）。</p>
 */

/** Awareness 上的一个客户端状态（我们只约定 `user` / `cursor` 两个字段，其余透传）。 */
export type CollabAwarenessState = Record<string, unknown>

/**
 * 只用到 Awareness 的这几个方法。
 *
 * <p>不直接依赖 `y-protocols/awareness` 的类型：它只是 `@hocuspocus/provider` 的 peer
 * 依赖，前端代码直接 import 需要额外把它写进 `package.json`；而真正的 `Awareness`
 * 结构上与这里兼容，赋值处由 TS 校验。</p>
 */
export interface CollabAwareness {
  readonly clientID: number
  getStates(): Map<number, CollabAwarenessState>
  getLocalState(): CollabAwarenessState | null
  setLocalStateField(field: string, value: unknown): void
  on(event: 'update' | 'change', listener: () => void): void
  off(event: 'update' | 'change', listener: () => void): void
}

/** 传输层连接状态（provider 视角，不含业务降级语义）。 */
export type CollabTransportState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'authentication-failed'

/** 建立一次房间连接所需的全部参数（票据来自 Java 接口，URL 来自服务端）。 */
export type CollabTransportOptions = {
  /** 服务端下发的 WebSocket 地址。 */
  url: string
  /** 房间名（= 文档名），由服务端下发。 */
  room: string
  /** 短票据；传函数表示"每次建连时换新票"（重连必须换，5 分钟过期）。 */
  token: string | (() => Promise<string | null>)
  /** 本地文档：传输层只负责把它的 update 收发，不拥有它的生命周期。 */
  doc: Y.Doc
}

/** 房间传输。`destroy()` 之后实例不可复用。 */
export interface CollabTransport {
  readonly state: CollabTransportState
  /** 是否已完成首次握手同步。 */
  readonly synced: boolean
  readonly awareness: CollabAwareness | null
  connect(): void
  disconnect(): void
  destroy(): void
  /** 状态/同步标志变化时回调；返回取消订阅函数。 */
  subscribe(listener: () => void): () => void
}

/** 传输工厂：生产是 Hocuspocus，测试是内存假实现。 */
export type CollabTransportFactory = (
  options: CollabTransportOptions,
) => CollabTransport

/** 规范化 token：provider 只接受 `string | (() => string | Promise<string>) | null`。 */
function tokenResolver(
  token: CollabTransportOptions['token'],
): string | (() => Promise<string>) {
  if (typeof token === 'string') return token
  return async () => (await token()) ?? ''
}

let factoryPromise: Promise<CollabTransportFactory> | null = null

/**
 * 加载官方 Hocuspocus 传输实现（首次调用触发动态 import，之后复用）。
 *
 * <p>默认 `sessionAwareness=false`：边车是 v3/v4 兼容实现，v4 的会话多路复用需要服务端
 * 明确支持，开启会改变文档名的编码方式。等边车确认支持后再考虑。</p>
 */
export function loadHocuspocusTransportFactory(): Promise<CollabTransportFactory> {
  factoryPromise ??= import('@hocuspocus/provider').then(
    ({ HocuspocusProvider, HocuspocusProviderWebsocket, WebSocketStatus }) =>
      (options) => {
        const listeners = new Set<() => void>()
        let state: CollabTransportState = 'connecting'
        let synced = false
        const notify = () => {
          for (const listener of listeners) listener()
        }
        /*
         * 显式建 WebSocket 层（而不是让 provider 内部建）：
         * `autoConnect: false` 让「何时连」由我们自己控制（建好观察者再连），
         * 并且只有这一层能拿到 `onMaxAttemptsFailed`（重试耗尽 = 彻底离线）。
         */
        const websocket = new HocuspocusProviderWebsocket({
          autoConnect: false,
          onMaxAttemptsFailed: () => {
            state = 'failed'
            notify()
          },
          onStatus: ({ status }) => {
            // 用官方枚举比较，不拿字符串字面量猜语义（枚举是 antd 生态的公开契约）
            state =
              status === WebSocketStatus.Connected
                ? 'connected'
                : status === WebSocketStatus.Connecting
                  ? 'connecting'
                  : 'disconnected'
            notify()
          },
          url: options.url,
        })
        const provider = new HocuspocusProvider({
          document: options.doc,
          name: options.room,
          onAuthenticationFailed: () => {
            state = 'authentication-failed'
            notify()
          },
          onSynced: ({ state: nextSynced }) => {
            synced = nextSynced
            notify()
          },
          token: tokenResolver(options.token),
          websocketProvider: websocket,
        })
        /*
         * **必须显式 attach**：传了 `websocketProvider` 时 provider 的 `manageSocket=false`，
         * 构造函数不再自动 attach（官方实现只有 `if (this.manageSocket) this.attach()`），
         * 于是 WebSocket 能连上、但 provider 从不注册收发与鉴权处理器 —— 表现为
         * 「状态=已连接、synced 永远 false、边车日志里没有一条『协作连接已认证』」。
         * attach() 幂等：只注册监听并发送首次 sync/auth，不建立第二条连接。
         */
        provider.attach()
        return {
          get state() {
            return state
          },
          get synced() {
            return synced
          },
          get awareness() {
            return provider.awareness
          },
          connect() {
            void websocket.connect()
          },
          disconnect() {
            websocket.disconnect()
          },
          destroy() {
            for (const listener of listeners) listener()
            listeners.clear()
            provider.destroy()
            websocket.destroy()
          },
          subscribe(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
          },
        }
      },
  )
  return factoryPromise
}

/** 仅供测试：重置动态 import 缓存（不同用例注入不同假工厂时互不影响）。 */
export function resetHocuspocusTransportFactoryForTests(): void {
  factoryPromise = null
}
