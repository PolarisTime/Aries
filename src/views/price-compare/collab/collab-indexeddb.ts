import * as Y from 'yjs'

/**
 * 客户端离线持久化（浏览器 IndexedDB）：零外部依赖实现 Y.Doc 快照的本地读写。
 *
 * <p>职责与边界：</p>
 * <ul>
 *   <li>房间初始化时从 IndexedDB 读回上次离线未同步的 Y.Doc 状态并 {@code Y.applyUpdate}
 *       合并（CRDT 幂等，之后 WS 握手同步会自动与服务端合并）；</li>
 *   <li>文档变更时按 300ms 防抖将完整状态写回 IndexedDB，断网/刷新页面后未发出改动不丢；</li>
 *   <li>使用独立 origin {@link COLLAB_INDEXEDDB_ORIGIN}：不进入本地 `Y.UndoManager`，
 *       也不会被冲突检测误判成「远端他人修改」；</li>
 *   <li>在无 `indexedDB`（如 jsdom 单测、隐私无痕模式）或存储受限时静默降级为 no-op，
 *       绝不阻断实时协作主链路。</li>
 * </ul>
 */
export const COLLAB_INDEXEDDB_ORIGIN = 'collab-indexeddb'

const DB_NAME = 'leo-price-collab-docs'
const STORE_NAME = 'docs'
const DB_VERSION = 1
const PERSIST_DEBOUNCE_MS = 300

export type CollabOfflinePersistence = {
  /** 首次从 IndexedDB 回放完成（失败或无缓存也会 resolve）。 */
  whenSynced: Promise<void>
  /** 立刻将挂起更新落盘并移除监听、关闭句柄。 */
  destroy: () => void
}

function openCollabDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function readStoredState(
  db: IDBDatabase,
  room: string,
): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(room)
      req.onsuccess = () => {
        const value = req.result
        if (value instanceof Uint8Array) {
          resolve(value)
          return
        }
        if (value instanceof ArrayBuffer) {
          resolve(new Uint8Array(value))
          return
        }
        resolve(null)
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function writeStoredState(
  db: IDBDatabase,
  room: string,
  state: Uint8Array,
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(state, room)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    } catch {
      resolve()
    }
  })
}

/** 为一个协作房间的 Y.Doc 挂载浏览器 IndexedDB 离线持久化。 */
export function attachIndexedDbPersistence(
  room: string,
  doc: Y.Doc,
  options?: { debounceMs?: number },
): CollabOfflinePersistence {
  const debounceMs = options?.debounceMs ?? PERSIST_DEBOUNCE_MS
  let destroyed = false
  let db: IDBDatabase | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let dirty = false

  const flushNow = () => {
    if (!db || !dirty) return
    dirty = false
    try {
      const state = Y.encodeStateAsUpdate(doc)
      void writeStoredState(db, room, state)
    } catch {
      // 持久化兜底失败不影响主流程
    }
  }

  const onUpdate = (_update: Uint8Array, origin: unknown) => {
    if (destroyed || origin === COLLAB_INDEXEDDB_ORIGIN) return
    dirty = true
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      flushNow()
    }, debounceMs)
  }

  doc.on('update', onUpdate)

  const whenSynced = openCollabDb().then(async (opened) => {
    if (!opened) return
    if (destroyed) {
      opened.close()
      return
    }
    db = opened
    const cached = await readStoredState(opened, room)
    if (!destroyed && cached && cached.byteLength > 0) {
      try {
        Y.applyUpdate(doc, cached, COLLAB_INDEXEDDB_ORIGIN)
      } catch {
        // 忽略损坏的本地缓存，由服务端快照接管
      }
    }
    if (!destroyed && dirty) {
      flushNow()
    }
  })

  return {
    whenSynced,
    destroy() {
      if (destroyed) return
      destroyed = true
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      doc.off('update', onUpdate)
      flushNow()
      if (db) {
        try {
          db.close()
        } catch {
          // ignore
        }
        db = null
      }
    },
  }
}
