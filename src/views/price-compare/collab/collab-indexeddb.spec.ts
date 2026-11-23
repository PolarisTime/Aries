import { afterEach, describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import {
  attachIndexedDbPersistence,
  COLLAB_INDEXEDDB_ORIGIN,
} from './collab-indexeddb'

/** 内存伪造的最小 IDBFactory：覆盖 open / objectStore / get / put / close。 */
function createFakeIndexedDb() {
  const stores = new Map<string, Map<string, unknown>>()

  const open = () => {
    const request: {
      result?: unknown
      onupgradeneeded?: () => void
      onsuccess?: () => void
      onerror?: () => void
    } = {}

    const db = {
      objectStoreNames: {
        contains: (name: string) => stores.has(name),
      },
      createObjectStore: (name: string) => {
        if (!stores.has(name)) stores.set(name, new Map())
      },
      transaction: (name: string) => {
        const tx: {
          objectStore: (storeName: string) => {
            get: (key: string) => {
              result?: unknown
              onsuccess?: () => void
              onerror?: () => void
            }
            put: (value: unknown, key: string) => void
          }
          oncomplete?: () => void
          onerror?: () => void
          onabort?: () => void
        } = {
          objectStore: (storeName: string) => {
            let bucket = stores.get(storeName)
            if (!bucket) {
              bucket = new Map()
              stores.set(storeName, bucket)
            }
            return {
              get: (key: string) => {
                const req: {
                  result?: unknown
                  onsuccess?: () => void
                  onerror?: () => void
                } = { result: bucket?.get(key) }
                queueMicrotask(() => req.onsuccess?.())
                return req
              },
              put: (value: unknown, key: string) => {
                bucket?.set(key, value)
                queueMicrotask(() => tx.oncomplete?.())
              },
            }
          },
        }
        if (!stores.has(name)) stores.set(name, new Map())
        return tx
      },
      close: () => {},
    }

    queueMicrotask(() => {
      request.result = db
      request.onupgradeneeded?.()
      request.onsuccess?.()
    })
    return request
  }

  return { open, stores }
}

describe('attachIndexedDbPersistence（协作离线持久化）', () => {
  const originalIndexedDb = (globalThis as { indexedDB?: unknown }).indexedDB

  afterEach(() => {
    if (originalIndexedDb === undefined) {
      delete (globalThis as { indexedDB?: unknown }).indexedDB
    } else {
      Object.defineProperty(globalThis, 'indexedDB', {
        configurable: true,
        writable: true,
        value: originalIndexedDb,
      })
    }
  })

  it('无 indexedDB 环境时静默降级为 no-op，不抛错', async () => {
    delete (globalThis as { indexedDB?: unknown }).indexedDB
    const doc = new Y.Doc()
    const persistence = attachIndexedDbPersistence('supplier-price:l1', doc, {
      debounceMs: 5,
    })

    await expect(persistence.whenSynced).resolves.toBeUndefined()
    doc.getMap('cells').set('k1', 3280)
    expect(() => persistence.destroy()).not.toThrow()
    doc.destroy()
  })

  it('写入本地变更后落盘，刷新重进房间时以 COLLAB_INDEXEDDB_ORIGIN 恢复', async () => {
    const fakeIdb = createFakeIndexedDb()
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: fakeIdb,
    })

    const doc1 = new Y.Doc()
    const p1 = attachIndexedDbPersistence('quote-sheet:s1', doc1, {
      debounceMs: 5,
    })
    await p1.whenSynced

    doc1.getMap('items').set('r1', { ton: 18.5, remark: '离线填写' })
    // 销毁时立即 flush 挂起更新
    p1.destroy()
    await new Promise((resolve) => setTimeout(resolve, 10))
    doc1.destroy()

    const doc2 = new Y.Doc()
    const origins: unknown[] = []
    doc2.on('update', (_update, origin) => origins.push(origin))

    const p2 = attachIndexedDbPersistence('quote-sheet:s1', doc2, {
      debounceMs: 5,
    })
    await p2.whenSynced

    expect(doc2.getMap('items').get('r1')).toEqual({
      ton: 18.5,
      remark: '离线填写',
    })
    expect(origins).toContain(COLLAB_INDEXEDDB_ORIGIN)

    p2.destroy()
    doc2.destroy()
  })
})
