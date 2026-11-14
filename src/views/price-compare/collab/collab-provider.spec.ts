import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { collabCellKeyOf, readCollabPrice, writeCollabCell } from './collab-doc'
import { createFakeCollabNetwork } from './collab-fake-provider'
import { readCollabPeers } from './collab-presence'
import type { CollabTransportOptions } from './collab-provider'

/**
 * 传输层生命周期（用内存假传输，**不连真实 WebSocket**）。
 *
 * <p>真实 `@hocuspocus/provider` 与假传输实现同一个 {@link CollabTransport} 接口，
 * 所以这里锁住的「建立 → 同步 → 断线 → 重连 → 销毁」行为对生产实现同样适用。
 * 注意假传输不在重连时补发离线期间的增量（真实 provider 会），"离线增量合并"的保证
 * 由 `collab-doc.spec.ts` 的 CRDT 用例覆盖。</p>
 */

const ROOM = 'supplier-price:9007199254740993'

const cellKey = collabCellKeyOf({
  category: '直条',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
})

function optionsOf(doc: Y.Doc): CollabTransportOptions {
  return { doc, room: ROOM, token: 'fake-token', url: 'ws://fake/collab' }
}

describe('collab-provider 传输生命周期', () => {
  it('建立连接：状态 connecting → connected，synced=true', () => {
    const { createTransport } = createFakeCollabNetwork()
    const doc = new Y.Doc()
    const transport = createTransport(optionsOf(doc))
    expect(transport.state).toBe('connecting')
    expect(transport.synced).toBe(false)

    const states: string[] = []
    transport.subscribe(() => states.push(transport.state))
    transport.connect()

    expect(transport.state).toBe('connected')
    expect(transport.synced).toBe(true)
    expect(states).toContain('connected')
    transport.destroy()
  })

  it('两个客户端互同步：一端写格，另一端立刻读到', () => {
    const { createTransport } = createFakeCollabNetwork()
    const docA = new Y.Doc()
    const docB = new Y.Doc()
    const a = createTransport(optionsOf(docA))
    const b = createTransport(optionsOf(docB))
    a.connect()
    b.connect()

    writeCollabCell(docA, cellKey, { price: 3280 })
    expect(readCollabPrice(docB, cellKey)).toBe(3280)

    writeCollabCell(docB, cellKey, { price: 3310 })
    expect(readCollabPrice(docA, cellKey)).toBe(3310)
    a.destroy()
    b.destroy()
  })

  it('断线后不再收到更新，重连后恢复', () => {
    const { server, createTransport } = createFakeCollabNetwork()
    const docA = new Y.Doc()
    const docB = new Y.Doc()
    const a = createTransport(optionsOf(docA))
    const b = createTransport(optionsOf(docB))
    a.connect()
    b.connect()

    server.dropConnections()
    expect(a.state).toBe('disconnected')
    expect(a.synced).toBe(false)

    // 断线期间写入不会到达对方
    writeCollabCell(docA, cellKey, { price: 3280 })
    expect(readCollabPrice(docB, cellKey)).toBeUndefined()

    a.connect()
    b.connect()
    expect(a.state).toBe('connected')
    // 重连时按状态向量补齐：断线期间的那一格改动合并过来，一格不丢
    expect(readCollabPrice(docB, cellKey)).toBe(3280)
    // 重连后新的改动恢复互达
    writeCollabCell(docA, cellKey, { price: 3300 })
    expect(readCollabPrice(docB, cellKey)).toBe(3300)
    a.destroy()
    b.destroy()
  })

  it('销毁后断开连接、不再投递更新', () => {
    const { server, createTransport } = createFakeCollabNetwork()
    const docA = new Y.Doc()
    const docB = new Y.Doc()
    const a = createTransport(optionsOf(docA))
    const b = createTransport(optionsOf(docB))
    a.connect()
    b.connect()
    expect(server.clientCount).toBe(2)

    a.destroy()
    expect(server.clientCount).toBe(1)
    writeCollabCell(docA, cellKey, { price: 3280 })
    expect(readCollabPrice(docB, cellKey)).toBeUndefined()
    b.destroy()
  })

  it('网络不可达：连接进入 failed（页面上应显示"离线"）', () => {
    const { server, createTransport } = createFakeCollabNetwork()
    server.setOffline(true)
    const transport = createTransport(optionsOf(new Y.Doc()))
    transport.connect()
    expect(transport.state).toBe('failed')
    expect(transport.synced).toBe(false)
    transport.destroy()
  })

  it('票据被拒：连接进入 authentication-failed', () => {
    const { server, createTransport } = createFakeCollabNetwork()
    const transport = createTransport(optionsOf(new Y.Doc()))
    transport.connect()
    server.rejectAuthentication()
    expect(transport.state).toBe('authentication-failed')
    transport.destroy()
  })

  it('取消订阅后不再收到状态通知', () => {
    const { createTransport } = createFakeCollabNetwork()
    const transport = createTransport(optionsOf(new Y.Doc()))
    let calls = 0
    const stop = transport.subscribe(() => {
      calls += 1
    })
    transport.connect()
    const afterConnect = calls
    expect(afterConnect).toBeGreaterThan(0)
    stop()
    transport.disconnect()
    expect(calls).toBe(afterConnect)
    transport.destroy()
  })
})

describe('collab-provider awareness 通道', () => {
  it('一端的用户信息与光标能被另一端读到，且不含自己', () => {
    const { createTransport } = createFakeCollabNetwork()
    const docA = new Y.Doc()
    const docB = new Y.Doc()
    const a = createTransport(optionsOf(docA))
    const b = createTransport(optionsOf(docB))
    a.connect()
    b.connect()

    const awarenessA = a.awareness
    const awarenessB = b.awareness
    expect(awarenessA).not.toBeNull()
    expect(awarenessB).not.toBeNull()
    if (!awarenessA || !awarenessB) return

    awarenessA.setLocalStateField('user', {
      id: 'u1',
      name: '张三',
      color: '#1677ff',
    })
    awarenessA.setLocalStateField('cursor', { cellKey })

    const peersAtB = readCollabPeers({
      states: awarenessB.getStates(),
      localClientId: awarenessB.clientID,
      listId: 'list-1',
    })
    expect(peersAtB).toHaveLength(1)
    expect(peersAtB[0]).toMatchObject({
      listId: 'list-1',
      user: { id: 'u1', name: '张三' },
      cursor: { cellKey },
    })

    // 自己不会以"远端"身份出现
    const peersAtA = readCollabPeers({
      states: awarenessA.getStates(),
      localClientId: awarenessA.clientID,
      listId: 'list-1',
    })
    expect(peersAtA).toHaveLength(0)
    a.destroy()
    b.destroy()
  })
})
