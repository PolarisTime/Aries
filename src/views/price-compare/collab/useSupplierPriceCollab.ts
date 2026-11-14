import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import * as Y from 'yjs'
import { useAuthStore } from '@/stores/authStore'
import {
  COLLAB_CONFLICT_WINDOW_MS,
  COLLAB_CURSOR_THROTTLE_MS,
  type CollabPriceValue,
} from './collab-config'
import {
  COLLAB_LOCAL_ORIGIN,
  type CollabCellValue,
  isCollabDocEmpty,
  observeCollabCells,
  readCollabPrice,
  seedCollabCells,
  writeCollabCell,
  writeCollabMeta,
} from './collab-doc'
import {
  type CollabPeer,
  type CollabPeerEdit,
  type CollabUser,
  publishCollabCursor,
  publishCollabUser,
  readCollabPeers,
} from './collab-presence'
import {
  type CollabTransport,
  type CollabTransportFactory,
  loadHocuspocusTransportFactory,
} from './collab-provider'
import {
  type CollabSessionOutcome,
  createSessionRefresher,
  requestCollabSession,
} from './collab-session-api'
import {
  type CollabConnectionState,
  type CollabEntryState,
  summarizeCollabState,
} from './collab-status'

/**
 * 供应商价格表实时协作的**生命周期 hook**（设计文档 M3/M4 的前端部分）。
 *
 * <p>职责边界：</p>
 * <ul>
 *   <li>取票据（`POST .../collab-sessions`）→ 建 Y.Doc → 建传输 → 等首次同步 → 播种；</li>
 *   <li>把「本地改格」翻译成 Y.Doc 写入，把「远端改格」翻译成冲突提示；</li>
 *   <li>维护连接状态、在线名单、光标节流、撤销/重做；</li>
 *   <li>任何一步失败都**收敛成降级状态**，由调用方继续走 REST 自动保存（不抛异常）。</li>
 * </ul>
 *
 * <p>一个房间 = 一张价格表（listId）。工作台一屏有多张表（多个品牌列），因此这里管理的是
 * **一组**房间：每个 listId 一条 entry（各自的 doc / awareness / undo 栈）。
 * 只有拿到票据的房间才进入协作；其余表继续 REST，互不影响。</p>
 */

/** 需要协作的一张表。 */
export type CollabTarget = {
  listId: string
  brandName: string
}

/** 文档为空时的播种数据来源（通常返回 REST 快照 + 本地未保存草稿）。 */
export type CollabSeed = (
  listId: string,
) => Iterable<readonly [string, CollabCellValue]>

export type UseSupplierPriceCollabOptions = {
  /** 当前供应商标签页；空表示还没选中供应商。 */
  supplierId: string | undefined
  /** 需要协作的表（品牌列 → listId）。 */
  targets: readonly CollabTarget[]
  /** feature flag；false 时一行代码都不执行（完全回退 REST）。 */
  enabled: boolean
  /** 文档为空时用它播种；不传则只用服务端同步下来的内容。 */
  seed?: CollabSeed
  /** 覆盖当前用户（默认取登录态；测试用来模拟不同人）。 */
  localUser?: { id: string; name: string; color?: string }
  /** 测试注入：传输工厂（默认动态加载 @hocuspocus/provider）。 */
  transportFactory?: CollabTransportFactory
  /** 测试注入：取票据函数。 */
  requestSession?: (listId: string) => Promise<CollabSessionOutcome>
  /** 测试注入：时钟。 */
  now?: () => number
}

export type SupplierPriceCollab = {
  /** `collab` = 至少一张表已连上且同步完成；否则 `rest`（现有自动保存链路）。 */
  mode: 'rest' | 'collab'
  state: CollabConnectionState
  /** 所有协作表都可写；只读账号（或只读票据）为 false。 */
  writable: boolean
  peers: readonly CollabPeer[]
  /** 某格上的远端光标。 */
  peersOfCell: (listId: string, cellKey: string) => CollabPeer[]
  /** 某格的价格：`undefined` = 该表没在协作 / 文档还没有这一格（调用方回退 REST 值）。 */
  priceOf: (listId: string, cellKey: string) => CollabPriceValue
  /** 该表是否已进入协作（逐表判断：部分表失败时其余表照常 REST）。 */
  isCollabList: (listId: string) => boolean
  setPrice: (listId: string, cellKey: string, price: number | null) => void
  setCursor: (listId: string, cellKey: string | null) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  /** 最近一次「自己刚改过、远端又改了同一格」的冲突（设计文档 §8）。 */
  lastPeerEdit: CollabPeerEdit | null
}

type CollabEntry = {
  listId: string
  brandName: string
  doc: Y.Doc
  transport: CollabTransport
  undoManager: Y.UndoManager
  state: CollabEntryState
  writable: boolean
  cleanup: () => void
}

/** 票据失败 → 页面级降级状态（UI 文案与是否提示都由它决定）。 */
function fallbackOfUnavailable(
  reason: Extract<CollabSessionOutcome, { kind: 'unavailable' }>['reason'],
): CollabConnectionState {
  if (reason === 'not-enabled') return 'unavailable'
  if (reason === 'forbidden') return 'auth-failed'
  return 'offline'
}

/** 传输层状态 → 协作房间状态（"disconnected" 是自动重连中，"failed" 才是彻底离线）。 */
function entryStateOf(transport: CollabTransport): CollabEntryState {
  switch (transport.state) {
    case 'connected':
      return transport.synced ? 'connected' : 'connecting'
    case 'connecting':
      return 'connecting'
    case 'disconnected':
      return 'reconnecting'
    case 'failed':
      return 'offline'
    case 'authentication-failed':
      return 'auth-failed'
  }
}

function localEditKey(listId: string, cellKey: string): string {
  return `${listId}\u0000${cellKey}`
}

/** 协作 hook。未开启/没会话时返回值恒为 `mode: 'rest'`，调用方无感。 */
export function useSupplierPriceCollab(
  options: UseSupplierPriceCollabOptions,
): SupplierPriceCollab {
  const { enabled, supplierId } = options
  const authUser = useAuthStore((state) => state.user)
  const [, bumpRender] = useReducer((tick: number) => tick + 1, 0)
  const [lastPeerEdit, setLastPeerEdit] = useState<CollabPeerEdit | null>(null)

  const entriesRef = useRef<CollabEntry[]>([])
  /** 一次都没连上时的降级原因（`disabled` = 正常未开启）。 */
  const fallbackRef = useRef<CollabConnectionState>('disabled')
  const localEditsRef = useRef(new Map<string, number>())
  const cursorTimersRef = useRef(new Map<string, number>())
  const pendingCursorRef = useRef(new Map<string, string | null>())
  /** 最新入参的镜像：effect 依赖只用「稳定键」，避免每渲染重启连接。 */
  const targetsRef = useRef(options.targets)
  const seedRef = useRef(options.seed)
  const nowRef = useRef(options.now ?? Date.now)
  const transportFactoryRef = useRef(options.transportFactory)
  const requestSessionRef = useRef(
    options.requestSession ?? requestCollabSession,
  )

  /** 稳定引用：它会进 effect 依赖，每次渲染换身份会让连接反复重启。 */
  const bump = useCallback(() => {
    bumpRender()
  }, [])

  // 入参镜像：先于生命周期 effect 执行（按声明顺序），保证新值在同一次提交内可见
  useEffect(() => {
    targetsRef.current = options.targets
    seedRef.current = options.seed
    transportFactoryRef.current = options.transportFactory
    requestSessionRef.current = options.requestSession ?? requestCollabSession
    nowRef.current = options.now ?? Date.now
  }, [
    options.now,
    options.requestSession,
    options.seed,
    options.targets,
    options.transportFactory,
  ])

  /*
   * 自己的用户信息：用 useMemo 收敛成稳定对象 —— 它进 effect 依赖，
   * 每次渲染现造字面量会让「建立连接」的 effect 每次都重跑。
   */
  const localUser = useMemo<CollabUser>(
    () => ({
      id: options.localUser?.id ?? authUser?.id ?? '',
      name:
        options.localUser?.name ??
        authUser?.userName?.trim() ??
        authUser?.loginName?.trim() ??
        '',
      color: options.localUser?.color ?? '#1677ff',
    }),
    [authUser?.id, authUser?.loginName, authUser?.userName, options.localUser],
  )

  const targetsKey = options.targets.map((target) => target.listId).join('|')

  useEffect(() => {
    if (!enabled || !supplierId || targetsKey === '') {
      destroyEntries(entriesRef.current)
      entriesRef.current = []
      fallbackRef.current = 'disabled'
      setLastPeerEdit(null)
      bump()
      return
    }

    let cancelled = false
    const created: CollabEntry[] = []

    const start = async () => {
      /*
       * 先取票据、再加载传输实现：`@hocuspocus/provider` + `yjs` 是动态 import 的大块，
       * 服务端没开协作时不该下载它们（设计文档 §15「前端包体增加」对策）。
       */
      const granted: {
        target: CollabTarget
        session: Extract<CollabSessionOutcome, { kind: 'session' }>['session']
      }[] = []
      for (const target of targetsRef.current) {
        const outcome = await requestSessionRef.current(target.listId)
        if (cancelled) return
        if (outcome.kind === 'unavailable') {
          fallbackRef.current = fallbackOfUnavailable(outcome.reason)
          bump()
          continue
        }
        granted.push({ target, session: outcome.session })
      }
      if (cancelled || granted.length === 0) return

      const factory =
        transportFactoryRef.current ?? (await loadHocuspocusTransportFactory())
      if (cancelled) return

      for (const { target, session } of granted) {
        const entry = createEntry({
          target,
          session,
          supplierId,
          factory,
          requestSession: requestSessionRef.current,
          localUser,
          bump,
          seedRef,
          nowRef,
          localEditsRef,
          setLastPeerEdit,
        })
        created.push(entry)
        entriesRef.current = [...entriesRef.current, entry]
        bump()
        entry.transport.connect()
      }
    }
    void start()

    return () => {
      cancelled = true
      destroyEntries(created)
      const removed = new Set(created)
      entriesRef.current = entriesRef.current.filter(
        (entry) => !removed.has(entry),
      )
      bump()
    }
    // targets 用 targetsKey 代表（数组每次渲染都是新身份）；localUser 已由 useMemo 稳定
  }, [bump, enabled, localUser, supplierId, targetsKey])

  // 卸载：清计时器 + 销毁所有连接
  useEffect(() => {
    const timers = cursorTimersRef.current
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer)
      timers.clear()
      destroyEntries(entriesRef.current)
      entriesRef.current = []
    }
  }, [])

  const entries = entriesRef.current
  const collabEntries = entries.filter((entry) => entry.state === 'connected')

  const peers: CollabPeer[] = []
  for (const entry of collabEntries) {
    const awareness = entry.transport.awareness
    if (!awareness) continue
    peers.push(
      ...readCollabPeers({
        states: awareness.getStates(),
        localClientId: awareness.clientID,
        listId: entry.listId,
      }),
    )
  }

  const writable =
    entries.length > 0 && entries.every((entry) => entry.writable)

  const setPrice = (listId: string, cellKey: string, price: number | null) => {
    const entry = entriesRef.current.find((item) => item.listId === listId)
    if (!entry || !entry.writable) return
    writeCollabCell(entry.doc, cellKey, { price })
    localEditsRef.current.set(localEditKey(listId, cellKey), nowRef.current())
  }

  const setCursor = (listId: string, cellKey: string | null) => {
    pendingCursorRef.current.set(listId, cellKey)
    if (cursorTimersRef.current.has(listId)) return
    const timer = window.setTimeout(() => {
      cursorTimersRef.current.delete(listId)
      const pending = pendingCursorRef.current.get(listId)
      pendingCursorRef.current.delete(listId)
      const entry = entriesRef.current.find((item) => item.listId === listId)
      const awareness = entry?.transport.awareness
      if (awareness) publishCollabCursor(awareness, pending ?? null)
    }, COLLAB_CURSOR_THROTTLE_MS)
    cursorTimersRef.current.set(listId, timer)
  }

  const undo = () => {
    for (const entry of entriesRef.current) entry.undoManager.undo()
  }
  const redo = () => {
    for (const entry of entriesRef.current) entry.undoManager.redo()
  }

  return {
    mode: collabEntries.length > 0 ? 'collab' : 'rest',
    state: summarizeCollabState(
      entries.map((entry) => entry.state),
      fallbackRef.current,
    ),
    writable,
    peers,
    peersOfCell: (listId, cellKey) =>
      peers.filter(
        (peer) => peer.listId === listId && peer.cursor?.cellKey === cellKey,
      ),
    priceOf: (listId, cellKey) => {
      const entry = entriesRef.current.find((item) => item.listId === listId)
      if (!entry || entry.state !== 'connected') return undefined
      return readCollabPrice(entry.doc, cellKey)
    },
    isCollabList: (listId) =>
      entriesRef.current.some(
        (entry) => entry.listId === listId && entry.state === 'connected',
      ),
    setPrice,
    setCursor,
    undo,
    redo,
    canUndo: entries.some((entry) => entry.undoManager.canUndo()),
    canRedo: entries.some((entry) => entry.undoManager.canRedo()),
    lastPeerEdit,
  }
}

/** 建一条房间 entry：doc / 传输 / 撤销栈 / awareness / 观察者，全部在这里接线。 */
function createEntry(args: {
  target: CollabTarget
  session: Extract<CollabSessionOutcome, { kind: 'session' }>['session']
  supplierId: string
  factory: CollabTransportFactory
  requestSession: (listId: string) => Promise<CollabSessionOutcome>
  localUser: CollabUser
  bump: () => void
  seedRef: { current: CollabSeed | undefined }
  nowRef: { current: () => number }
  localEditsRef: { current: Map<string, number> }
  setLastPeerEdit: (edit: CollabPeerEdit | null) => void
}): CollabEntry {
  const { target, session, supplierId, factory } = args
  const doc = new Y.Doc()
  writeCollabMeta(doc, {
    listId: target.listId,
    supplierId,
    brandName: target.brandName,
  })

  const transport = factory({
    url: session.url,
    room: session.room,
    token: createSessionRefresher(target.listId, args.requestSession),
    doc,
  })

  const cells = doc.getMap('cells')
  const undoManager = new Y.UndoManager(cells, {
    // 只撤销自己的操作：远端 update 的 origin 不是本地标记，不会被收进栈
    trackedOrigins: new Set([COLLAB_LOCAL_ORIGIN]),
  })

  const entry: CollabEntry = {
    listId: target.listId,
    brandName: target.brandName,
    doc,
    transport,
    undoManager,
    state: 'connecting',
    writable: session.writable,
    cleanup: () => {},
  }

  const awareness = transport.awareness
  if (awareness) {
    publishCollabUser(awareness, args.localUser)
    awareness.on('change', args.bump)
  }

  const seedIfNeeded = () => {
    const seed = args.seedRef.current
    if (!seed || !isCollabDocEmpty(doc)) return
    const entries = [...seed(target.listId)]
    if (entries.length) seedCollabCells(doc, entries)
  }

  const unsubscribeTransport = transport.subscribe(() => {
    entry.state = entryStateOf(transport)
    if (entry.state === 'connected') seedIfNeeded()
    args.bump()
  })

  const stopObserve = observeCollabCells(doc, (changes) => {
    const now = args.nowRef.current()
    for (const change of changes) {
      if (!change.remote) continue
      const editedAt = args.localEditsRef.current.get(
        localEditKey(target.listId, change.cellKey),
      )
      if (
        editedAt !== undefined &&
        now - editedAt <= COLLAB_CONFLICT_WINDOW_MS
      ) {
        args.setLastPeerEdit({
          listId: target.listId,
          cellKey: change.cellKey,
          price: change.value?.price ?? null,
          at: now,
        })
      }
    }
    args.bump()
  })

  const onStack = () => args.bump()
  undoManager.on('stack-item-added', onStack)
  undoManager.on('stack-item-popped', onStack)

  entry.cleanup = () => {
    unsubscribeTransport()
    stopObserve()
    awareness?.off('change', args.bump)
    undoManager.off('stack-item-added', onStack)
    undoManager.off('stack-item-popped', onStack)
    undoManager.destroy()
    transport.destroy()
    doc.destroy()
  }

  return entry
}

/** 销毁一组 entry（幂等：重复调用只会执行一次 cleanup）。 */
function destroyEntries(entries: readonly CollabEntry[]): void {
  for (const entry of entries) {
    try {
      entry.cleanup()
    } catch {
      // 清理失败不能阻断其它连接销毁：退出页面时的收尾以"尽力"为准
    }
  }
}
