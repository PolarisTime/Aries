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
import type { PriceRow } from '../types'
import { COLLAB_CURSOR_THROTTLE_MS } from './collab-config'
import { COLLAB_LOCAL_ORIGIN } from './collab-doc'
import { attachIndexedDbPersistence } from './collab-indexeddb'
import {
  type CollabPeer,
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
  type CollabSessionRequest,
  createSessionRefresher,
  requestQuoteSheetCollabSession,
} from './collab-session-api'
import {
  type CollabConnectionState,
  type CollabEntryState,
  summarizeCollabState,
} from './collab-status'
import {
  isQuoteSheetDocEmpty,
  observeQuoteSheetItems,
  type QuoteSheetItemChange,
  type QuoteSheetItemPatch,
  type QuoteSheetItemValue,
  seedMissingQuoteSheetItems,
  seedQuoteSheetItems,
  writeQuoteSheetItem,
  writeQuoteSheetMeta,
} from './quote-sheet-doc'

/**
 * 报单比价（报价单）的协作 hook：复用供应商报价页的传输/票据/状态/在线名单，
 * 只把「文档模型」换成 {@link import('./quote-sheet-doc')} 的 items。
 *
 * <p>协作范围只有**报单吨位与行备注**；价格是实时派生且只读，不进 CRDT。
 * 行结构（增删行/改规格/排序）仍走 REST —— 本 hook 不改结构，只在行集合变化后
 * 给文档补缺失行。</p>
 *
 * <p>数据通路只有一条：**Y.Doc 是 ton/remark 的真相源**，文档变化经 `setRows` 回到
 * 既有的 rows 状态（远端改动因此和本地输入走同一套渲染/保存链路，不产生两份状态）。</p>
 */

export type UseQuoteSheetCollabOptions = {
  /** 服务端报价单 id；本地新建（还没保存）时为 undefined，此时不可能有房间。 */
  sheetId: string | undefined
  /** feature flag；false 时一行代码都不执行（完全走现有 REST 保存）。 */
  enabled: boolean
  /** 当前行：仅用于首同步与增行后播种。 */
  rows: readonly PriceRow[]
  /** 既有的行状态写入口：远端 ton/remark 通过它回到 rows（单一数据通路）。 */
  setRows: (updater: (rows: PriceRow[]) => PriceRow[]) => void
  /** 覆盖当前用户（默认取登录态；测试用来模拟不同人）。 */
  localUser?: { id: string; name: string; color?: string }
  /** 测试注入：传输工厂（默认动态加载 @hocuspocus/provider）。 */
  transportFactory?: CollabTransportFactory
  /** 测试注入：取票据函数（默认打 quote-sheets 接口）。 */
  requestSession?: CollabSessionRequest
  /** 是否启用浏览器 IndexedDB 离线持久化（默认 true；无 indexedDB 环境自动降级 no-op）。 */
  enableOfflinePersistence?: boolean
}

export type QuoteSheetCollab = {
  /** `collab` = 已连上且首同步完成；否则 `rest`（现有 REST 保存链路）。 */
  mode: 'rest' | 'collab'
  state: CollabConnectionState
  /** 票据 writable=false 时为 false（整表只读）。 */
  writable: boolean
  peers: readonly CollabPeer[]
  /** 某一行的远端光标（谁正停在这一行）。 */
  peersOfRow: (rowId: string) => CollabPeer[]
  /** 写一行的 ton/remark（本地 origin）；只在该行协作时调用。 */
  patchItem: (itemId: string, patch: QuoteSheetItemPatch) => void
  /** 上报自己的行光标（节流）；`null` = 离开行。 */
  setCursor: (itemId: string | null) => void
  /** 协作模式撤销/重做（仅撤销自己的 ton/remark 改动，不影响他人）。 */
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

type QuoteSheetRoom = {
  sheetId: string
  doc: Y.Doc
  transport: CollabTransport
  undoManager: Y.UndoManager
  awareable: boolean
  writable: boolean
  state: CollabEntryState
  cleanup: () => void
}

/** 票据失败 → 页面级降级状态（与供应商报价页同一套文案）。 */
function fallbackOfUnavailable(
  reason: Extract<CollabSessionOutcome, { kind: 'unavailable' }>['reason'],
): CollabConnectionState {
  if (reason === 'not-enabled') return 'unavailable'
  if (reason === 'forbidden') return 'auth-failed'
  return 'offline'
}

/** 传输层状态 → 房间状态（`disconnected` 是自动重连中，`failed` 才是彻底离线）。 */
function roomStateOf(transport: CollabTransport): CollabEntryState {
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

/** 把行值投影成 CRDT 值（只保留 ton/remark，绝不带价格或规格）。 */
function itemValueOf(row: PriceRow): QuoteSheetItemValue {
  return { ton: row.ton, remark: row.remark }
}

/** 协作 hook。未开启 / 没票据 / 本地新建单据时恒为 `mode: 'rest'`。 */
export function useQuoteSheetCollab(
  options: UseQuoteSheetCollabOptions,
): QuoteSheetCollab {
  const { enabled, setRows, sheetId } = options
  const authUser = useAuthStore((state) => state.user)
  const [, bumpRender] = useReducer((tick: number) => tick + 1, 0)
  const [room, setRoom] = useState<QuoteSheetRoom | null>(null)

  const roomRef = useRef<QuoteSheetRoom | null>(null)
  const fallbackRef = useRef<CollabConnectionState>('disabled')
  const rowsRef = useRef(options.rows)
  const setRowsRef = useRef(setRows)
  const transportFactoryRef = useRef(options.transportFactory)
  const requestSessionRef = useRef<CollabSessionRequest>(
    options.requestSession ?? requestQuoteSheetCollabSession,
  )
  const cursorTimerRef = useRef<number | null>(null)
  const pendingCursorRef = useRef<string | null>(null)

  const bump = useCallback(() => {
    bumpRender()
  }, [])

  // 入参镜像：先于生命周期 effect 执行（按声明顺序），保证同一次提交内可见最新值
  useEffect(() => {
    rowsRef.current = options.rows
    setRowsRef.current = options.setRows
    transportFactoryRef.current = options.transportFactory
    requestSessionRef.current =
      options.requestSession ?? requestQuoteSheetCollabSession
  }, [
    options.requestSession,
    options.rows,
    options.setRows,
    options.transportFactory,
  ])

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

  /** 文档变化 → rows（唯一数据通路）。播种产生的变化与当前 rows 相等，会被直接跳过。 */
  const applyChanges = useCallback(
    (changes: readonly QuoteSheetItemChange[]) => {
      const values = new Map<string, QuoteSheetItemValue>()
      for (const change of changes) values.set(change.itemId, change.value)
      if (!values.size) return
      setRowsRef.current((list) => {
        let touched = false
        const next = list.map((row) => {
          const value = values.get(row.id)
          if (!value) return row
          if (row.ton === value.ton && row.remark === value.remark) return row
          touched = true
          return { ...row, ton: value.ton, remark: value.remark }
        })
        return touched ? next : list
      })
    },
    [],
  )

  useEffect(() => {
    if (!enabled || !sheetId) {
      destroyRoom(roomRef.current)
      roomRef.current = null
      setRoom(null)
      fallbackRef.current = 'disabled'
      bump()
      return
    }

    let cancelled = false
    const start = async () => {
      const outcome = await requestSessionRef.current(sheetId)
      if (cancelled) return
      if (outcome.kind === 'unavailable') {
        fallbackRef.current = fallbackOfUnavailable(outcome.reason)
        bump()
        return
      }
      const factory =
        transportFactoryRef.current ?? (await loadHocuspocusTransportFactory())
      if (cancelled) return

      const doc = new Y.Doc()
      const offline =
        options.enableOfflinePersistence !== false
          ? attachIndexedDbPersistence(outcome.session.room, doc)
          : null
      writeQuoteSheetMeta(doc, { sheetId })
      const transport = factory({
        doc,
        room: outcome.session.room,
        token: createSessionRefresher(sheetId, requestSessionRef.current),
        url: outcome.session.url,
      })
      const itemsMap = doc.getMap('items')
      const undoManager = new Y.UndoManager(itemsMap, {
        // 只撤销当前用户自己的 ton/remark 改动，远端 update 不进入本地撤销栈
        trackedOrigins: new Set([COLLAB_LOCAL_ORIGIN]),
      })
      const created: QuoteSheetRoom = {
        sheetId,
        doc,
        transport,
        undoManager,
        awareable: Boolean(transport.awareness),
        writable: outcome.session.writable,
        state: 'connecting',
        cleanup: () => {},
      }

      const onStack = () => bump()
      undoManager.on('stack-item-added', onStack)
      undoManager.on('stack-item-popped', onStack)

      const awareness = transport.awareness
      if (awareness) {
        publishCollabUser(awareness, localUser)
        awareness.on('change', bump)
      }

      const seedIfNeeded = () => {
        if (!isQuoteSheetDocEmpty(doc)) return
        const entries = rowsRef.current.map(
          (row) => [row.id, itemValueOf(row)] as const,
        )
        if (entries.length) seedQuoteSheetItems(doc, entries)
      }

      const unsubscribe = transport.subscribe(() => {
        created.state = roomStateOf(transport)
        if (created.state === 'connected') seedIfNeeded()
        bump()
      })

      const stopObserve = observeQuoteSheetItems(doc, (changes) => {
        applyChanges(changes)
        bump()
      })

      created.cleanup = () => {
        unsubscribe()
        stopObserve()
        awareness?.off('change', bump)
        undoManager.off('stack-item-added', onStack)
        undoManager.off('stack-item-popped', onStack)
        undoManager.destroy()
        offline?.destroy()
        transport.destroy()
        doc.destroy()
      }

      roomRef.current = created
      setRoom(created)
      bump()
      transport.connect()
    }
    void start()

    return () => {
      cancelled = true
      destroyRoom(roomRef.current)
      roomRef.current = null
      setRoom(null)
      bump()
    }
  }, [
    applyChanges,
    bump,
    enabled,
    localUser,
    options.enableOfflinePersistence,
    sheetId,
  ])

  /*
   * 行集合变化（增行/删行/换单）后给文档补缺失行：
   * 结构变更走 REST，这里只用当前 rows 的 ton/remark 把新行播种进去，不碰已有行。
   */
  const rowIdsKey = options.rows.map((row) => row.id).join('|')
  // biome-ignore lint/correctness/useExhaustiveDependencies: rowIdsKey 就是「行集合变了」的信号，effect 体内读的是 rowsRef 里的最新值
  useEffect(() => {
    const current = roomRef.current
    if (!current || current.state === 'connecting') return
    if (!options.rows.length) return
    seedMissingQuoteSheetItems(
      current.doc,
      options.rows.map((row) => [row.id, itemValueOf(row)] as const),
    )
  }, [rowIdsKey, options.rows])

  // 卸载：清光标计时器 + 销毁房间
  useEffect(() => {
    return () => {
      if (cursorTimerRef.current !== null) {
        window.clearTimeout(cursorTimerRef.current)
        cursorTimerRef.current = null
      }
      destroyRoom(roomRef.current)
      roomRef.current = null
    }
  }, [])

  const connected = room?.state === 'connected'
  const peers: CollabPeer[] = []
  const awareness = room?.transport.awareness
  if (connected && awareness) {
    peers.push(
      ...readCollabPeers({
        states: awareness.getStates(),
        localClientId: awareness.clientID,
        listId: room.sheetId,
      }),
    )
  }

  const patchItem = (itemId: string, patch: QuoteSheetItemPatch) => {
    const current = roomRef.current
    if (!current || current.state !== 'connected' || !current.writable) return
    writeQuoteSheetItem(current.doc, itemId, patch)
  }

  const setCursor = (itemId: string | null) => {
    pendingCursorRef.current = itemId
    if (cursorTimerRef.current !== null) return
    cursorTimerRef.current = window.setTimeout(() => {
      cursorTimerRef.current = null
      const pending = pendingCursorRef.current
      pendingCursorRef.current = null
      const current = roomRef.current
      const localAwareness = current?.transport.awareness
      if (localAwareness) publishCollabCursor(localAwareness, pending)
    }, COLLAB_CURSOR_THROTTLE_MS)
  }

  const undo = () => {
    const current = roomRef.current
    if (!current || current.state !== 'connected' || !current.writable) return
    current.undoManager.undo()
  }

  const redo = () => {
    const current = roomRef.current
    if (!current || current.state !== 'connected' || !current.writable) return
    current.undoManager.redo()
  }

  return {
    mode: connected ? 'collab' : 'rest',
    state: summarizeCollabState(room ? [room.state] : [], fallbackRef.current),
    writable: room?.writable ?? false,
    peers,
    peersOfRow: (rowId) =>
      peers.filter(
        (peer) =>
          peer.listId === room?.sheetId && peer.cursor?.cellKey === rowId,
      ),
    patchItem,
    setCursor,
    undo,
    redo,
    canUndo: Boolean(connected && room?.writable && room.undoManager.canUndo()),
    canRedo: Boolean(connected && room?.writable && room.undoManager.canRedo()),
  }
}

/** 销毁房间（幂等：cleanup 只注册一次）。 */
function destroyRoom(room: QuoteSheetRoom | null): void {
  if (!room) return
  try {
    room.cleanup()
  } catch {
    // 退出页面时的收尾以"尽力"为准，清理失败不能阻断其它清理
  }
}
