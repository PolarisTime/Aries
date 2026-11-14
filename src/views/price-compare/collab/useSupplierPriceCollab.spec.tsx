// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type CollabCellValue, collabCellKeyOf } from './collab-doc'
import { createFakeCollabNetwork } from './collab-fake-provider'
import type { CollabSessionOutcome } from './collab-session-api'
import {
  type SupplierPriceCollab,
  type UseSupplierPriceCollabOptions,
  useSupplierPriceCollab,
} from './useSupplierPriceCollab'

/**
 * 协作 hook 的端到端行为（假传输 + 假票据，**不连真实 WebSocket**）。
 *
 * <p>覆盖设计文档里必须成立的四类路径：</p>
 * <ul>
 *   <li>降级：开关关闭 / 服务端未开 / 网络不可达 / 鉴权失败 → 一律回到 `mode: 'rest'`；</li>
 *   <li>建立：拿到票据 → 建连 → 首次同步后播种 → 进入 `collab`；</li>
 *   <li>协作：两端改同一格收敛、在线名单、光标、撤销只撤自己、同格冲突提示；</li>
 *   <li>销毁：卸载后不残留连接。</li>
 * </ul>
 */

const LIST_ID = 'list-1'
const CELL_KEY = collabCellKeyOf({
  category: '直条',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
})

const SEEDED: CollabCellValue = {
  price: 3280,
  priceStatus: 'NORMAL',
  remark: '',
}

const sessionOutcome = (writable = true): CollabSessionOutcome => ({
  kind: 'session',
  session: {
    room: `supplier-price:${LIST_ID}`,
    url: 'ws://fake/collab',
    token: 'fake-token',
    writable,
    color: '#1677ff',
    expiresAt: null,
  },
})

type Probe = { current: SupplierPriceCollab | null }

function ProbeComponent({
  options,
  probe,
}: {
  options: UseSupplierPriceCollabOptions
  probe: Probe
}) {
  const collab = useSupplierPriceCollab(options)
  probe.current = collab
  return null
}

/** 排空 React 调度与 hook 内部异步建连的微任务。 */
async function flush(ms = 0) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}

describe('useSupplierPriceCollab', () => {
  let container: HTMLDivElement
  let root: Root
  let probe: Probe

  const mount = (options: UseSupplierPriceCollabOptions) => {
    probe = { current: null }
    act(() => {
      root.render(createElement(ProbeComponent, { options, probe }))
    })
  }

  const collab = (): SupplierPriceCollab => {
    if (!probe.current) throw new Error('hook 尚未渲染')
    return probe.current
  }

  const baseOptions = (
    overrides: Partial<UseSupplierPriceCollabOptions> = {},
  ): UseSupplierPriceCollabOptions => ({
    enabled: true,
    localUser: { id: 'u1', name: '张三' },
    now: () => 1_000,
    requestSession: () => Promise.resolve(sessionOutcome()),
    seed: () => [[CELL_KEY, SEEDED]],
    supplierId: 'supplier-1',
    targets: [{ brandName: '萍钢', listId: LIST_ID }],
    ...overrides,
  })

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('feature flag 关闭：不取票据、不建连，保持 rest', async () => {
    const requestSession = vi.fn(() => Promise.resolve(sessionOutcome()))
    mount(baseOptions({ enabled: false, requestSession }))
    await flush()

    expect(requestSession).not.toHaveBeenCalled()
    expect(collab().mode).toBe('rest')
    expect(collab().state).toBe('disabled')
  })

  it('服务端未开启协作（404）：静默回退 rest', async () => {
    const requestSession = vi.fn(
      (): Promise<CollabSessionOutcome> =>
        Promise.resolve({
          kind: 'unavailable',
          reason: 'not-enabled',
        }),
    )
    mount(baseOptions({ requestSession }))
    await flush()

    expect(collab().mode).toBe('rest')
    expect(collab().state).toBe('unavailable')
    expect(collab().writable).toBe(false)
  })

  it('网络不可达：降级为 offline，仍保持 rest', async () => {
    mount(
      baseOptions({
        requestSession: () =>
          Promise.resolve<CollabSessionOutcome>({
            kind: 'unavailable',
            reason: 'network',
          }),
      }),
    )
    await flush()
    expect(collab().mode).toBe('rest')
    expect(collab().state).toBe('offline')
  })

  it('鉴权失败：降级为 auth-failed，仍保持 rest', async () => {
    mount(
      baseOptions({
        requestSession: () =>
          Promise.resolve<CollabSessionOutcome>({
            kind: 'unavailable',
            reason: 'forbidden',
          }),
      }),
    )
    await flush()
    expect(collab().state).toBe('auth-failed')
  })

  it('拿到票据：建连成功、文档为空时按 REST 快照播种，进入 collab', async () => {
    const network = createFakeCollabNetwork()
    mount(baseOptions({ transportFactory: network.createTransport }))
    await flush()

    expect(collab().mode).toBe('collab')
    expect(collab().state).toBe('connected')
    expect(collab().writable).toBe(true)
    expect(collab().isCollabList(LIST_ID)).toBe(true)
    expect(collab().priceOf(LIST_ID, CELL_KEY)).toBe(3280)
    // 没写过的格返回 undefined：调用方要回退 REST 值，而不是显示空
    expect(
      collab().priceOf(
        LIST_ID,
        collabCellKeyOf({
          category: '直条',
          material: 'HRB400E',
          spec: 40,
          length: '9米',
        }),
      ),
    ).toBeUndefined()
  })

  it('只读票据：writable=false，本地写入被忽略', async () => {
    const network = createFakeCollabNetwork()
    mount(
      baseOptions({
        requestSession: () => Promise.resolve(sessionOutcome(false)),
        transportFactory: network.createTransport,
      }),
    )
    await flush()

    expect(collab().writable).toBe(false)
    act(() => collab().setPrice(LIST_ID, CELL_KEY, 3500))
    expect(collab().priceOf(LIST_ID, CELL_KEY)).toBe(3280)
  })

  it('两个客户端：一端改格另一端立刻看到，在线名单互见', async () => {
    const network = createFakeCollabNetwork()
    const probeA: Probe = { current: null }
    const probeB: Probe = { current: null }
    const containerB = document.createElement('div')
    document.body.appendChild(containerB)
    const rootB = createRoot(containerB)

    act(() => {
      root.render(
        createElement(ProbeComponent, {
          options: baseOptions({ transportFactory: network.createTransport }),
          probe: probeA,
        }),
      )
    })
    act(() => {
      rootB.render(
        createElement(ProbeComponent, {
          options: baseOptions({
            localUser: { id: 'u2', name: '李四', color: '#52c41a' },
            transportFactory: network.createTransport,
          }),
          probe: probeB,
        }),
      )
    })
    await flush()

    const a = probeA.current
    const b = probeB.current
    expect(a?.mode).toBe('collab')
    expect(b?.mode).toBe('collab')

    // A 改一格 → B 读到；A 的在线名单能看到 B，反之亦然
    act(() => a?.setPrice(LIST_ID, CELL_KEY, 3300))
    await flush()
    expect(b?.priceOf(LIST_ID, CELL_KEY)).toBe(3300)
    expect(b?.peers.map((item) => item.user.name)).toContain('张三')
    expect(a?.peers.map((item) => item.user.name)).toContain('李四')

    act(() => rootB.unmount())
    containerB.remove()
  })

  it('光标按 80ms 节流上报，远端 peersOfCell 能定位到格子', async () => {
    const network = createFakeCollabNetwork()
    const probeA: Probe = { current: null }
    const probeB: Probe = { current: null }
    const containerB = document.createElement('div')
    document.body.appendChild(containerB)
    const rootB = createRoot(containerB)

    act(() => {
      root.render(
        createElement(ProbeComponent, {
          options: baseOptions({ transportFactory: network.createTransport }),
          probe: probeA,
        }),
      )
    })
    act(() => {
      rootB.render(
        createElement(ProbeComponent, {
          options: baseOptions({
            localUser: { id: 'u2', name: '李四' },
            transportFactory: network.createTransport,
          }),
          probe: probeB,
        }),
      )
    })
    await flush()

    act(() => probeA.current?.setCursor(LIST_ID, CELL_KEY))
    // 节流窗口未到：还没有上报
    expect(probeB.current?.peersOfCell(LIST_ID, CELL_KEY)).toHaveLength(0)
    await flush(120)
    expect(probeB.current?.peersOfCell(LIST_ID, CELL_KEY)).toHaveLength(1)
    expect(probeB.current?.peersOfCell(LIST_ID, CELL_KEY)[0]?.user.name).toBe(
      '张三',
    )

    act(() => rootB.unmount())
    containerB.remove()
  })

  it('撤销只撤自己的操作：undo 回到播种值', async () => {
    const network = createFakeCollabNetwork()
    mount(baseOptions({ transportFactory: network.createTransport }))
    await flush()

    act(() => collab().setPrice(LIST_ID, CELL_KEY, 3500))
    expect(collab().priceOf(LIST_ID, CELL_KEY)).toBe(3500)
    expect(collab().canUndo).toBe(true)

    act(() => collab().undo())
    expect(collab().priceOf(LIST_ID, CELL_KEY)).toBe(3280)
  })

  it('同格冲突：本地刚改过、远端随即改同一格 → 记录冲突提示', async () => {
    const network = createFakeCollabNetwork()
    const probeA: Probe = { current: null }
    const probeB: Probe = { current: null }
    const containerB = document.createElement('div')
    document.body.appendChild(containerB)
    const rootB = createRoot(containerB)

    act(() => {
      root.render(
        createElement(ProbeComponent, {
          options: baseOptions({
            now: () => 1_000,
            transportFactory: network.createTransport,
          }),
          probe: probeA,
        }),
      )
    })
    act(() => {
      rootB.render(
        createElement(ProbeComponent, {
          options: baseOptions({
            localUser: { id: 'u2', name: '李四' },
            transportFactory: network.createTransport,
          }),
          probe: probeB,
        }),
      )
    })
    await flush()

    expect(probeA.current?.lastPeerEdit).toBeNull()
    act(() => probeA.current?.setPrice(LIST_ID, CELL_KEY, 3300))
    act(() => probeB.current?.setPrice(LIST_ID, CELL_KEY, 3350))
    await flush()

    expect(probeA.current?.lastPeerEdit).toMatchObject({
      listId: LIST_ID,
      cellKey: CELL_KEY,
      price: 3350,
    })

    act(() => rootB.unmount())
    containerB.remove()
  })

  it('卸载后不残留连接', async () => {
    const network = createFakeCollabNetwork()
    mount(baseOptions({ transportFactory: network.createTransport }))
    await flush()
    expect(network.server.clientCount).toBe(1)

    act(() => root.unmount())
    expect(network.server.clientCount).toBe(0)
    // 让 afterEach 的 unmount 不再重复执行
    root = createRoot(container)
  })
})
