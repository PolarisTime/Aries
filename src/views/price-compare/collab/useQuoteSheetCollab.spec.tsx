// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PriceRow } from '../types'
import { createFakeCollabNetwork } from './collab-fake-provider'
import type { CollabSessionOutcome } from './collab-session-api'
import {
  type QuoteSheetCollab,
  type UseQuoteSheetCollabOptions,
  useQuoteSheetCollab,
} from './useQuoteSheetCollab'

/**
 * 报单比价协作 hook（假传输 + 假票据，不连真实 ws）。
 *
 * <p>锁住：① 开关关闭/服务端未开时完全走 REST（不取票、不建连）；② 拿到票据后
 * ton/remark 的远端改动会经 `setRows` 回到既有 rows 数据通路；③ 只读票据下写入被忽略；
 * ④ 行光标经 awareness 互见；⑤ 卸载后不残留连接。</p>
 */

const SHEET_ID = 'sheet-1'

const sessionOutcome = (writable = true): CollabSessionOutcome => ({
  kind: 'session',
  session: {
    room: `quote-sheet:${SHEET_ID}`,
    url: 'ws://fake/collab',
    token: 'fake-token',
    writable,
    color: '#1677ff',
    expiresAt: null,
  },
})

const rowsOf = (): PriceRow[] => [
  {
    id: 'r1',
    category: '直条',
    material: 'HRB400E',
    spec: 12,
    length: '9米',
    ton: 12.5,
    remark: '急单',
  },
  {
    id: 'r2',
    category: '直条',
    material: 'HRB400E',
    spec: 14,
    length: '9米',
  },
]

type Probe = {
  collab: QuoteSheetCollab | null
  rows: PriceRow[]
}

function ProbeComponent({
  options,
  probe,
  initialRows,
}: {
  options: Omit<UseQuoteSheetCollabOptions, 'rows' | 'setRows'>
  probe: Probe
  initialRows: PriceRow[]
}) {
  const [rows, setRows] = React.useState<PriceRow[]>(initialRows)
  const collab = useQuoteSheetCollab({ ...options, rows, setRows })
  probe.collab = collab
  probe.rows = rows
  return null
}

/** 需要在组件外拿 React：用 import 的 hooks 包一层，避免测试文件里再引一套。 */
import * as React from 'react'

async function flush(ms = 0) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}

describe('useQuoteSheetCollab', () => {
  let container: HTMLDivElement
  let root: Root

  const mount = (
    options: Omit<UseQuoteSheetCollabOptions, 'rows' | 'setRows'>,
    initialRows: PriceRow[] = rowsOf(),
  ): Probe => {
    const probe: Probe = { collab: null, rows: initialRows }
    act(() => {
      root.render(
        createElement(ProbeComponent, {
          initialRows,
          options,
          probe,
        }),
      )
    })
    return probe
  }

  const collabOf = (probe: Probe): QuoteSheetCollab => {
    if (!probe.collab) throw new Error('hook 尚未渲染')
    return probe.collab
  }

  const baseOptions = (
    overrides: Partial<
      Omit<UseQuoteSheetCollabOptions, 'rows' | 'setRows'>
    > = {},
  ): Omit<UseQuoteSheetCollabOptions, 'rows' | 'setRows'> => ({
    enabled: true,
    localUser: { id: 'u1', name: '张三' },
    requestSession: () => Promise.resolve(sessionOutcome()),
    sheetId: SHEET_ID,
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

  it('flag 关闭：不取票据、不建连，ton/remark 保持 REST 路径', async () => {
    const requestSession = vi.fn(() => Promise.resolve(sessionOutcome()))
    const probe = mount(baseOptions({ enabled: false, requestSession }))
    await flush()

    expect(requestSession).not.toHaveBeenCalled()
    expect(collabOf(probe).mode).toBe('rest')
    expect(collabOf(probe).state).toBe('disabled')
    // 未协作时 patchItem 不会写任何东西（本地 rows 由既有 patchRow 负责）
    act(() => collabOf(probe).patchItem('r1', { ton: 99 }))
    expect(probe.rows[0]?.ton).toBe(12.5)
  })

  it('服务端未提供协作：静默回退 rest', async () => {
    const probe = mount(
      baseOptions({
        requestSession: () =>
          Promise.resolve<CollabSessionOutcome>({
            kind: 'unavailable',
            reason: 'not-enabled',
          }),
      }),
    )
    await flush()
    expect(collabOf(probe).mode).toBe('rest')
    expect(collabOf(probe).state).toBe('unavailable')
  })

  it('拿到票据：建连成功并进入协作，播种不改变当前 rows', async () => {
    const network = createFakeCollabNetwork()
    const probe = mount(
      baseOptions({ transportFactory: network.createTransport }),
    )
    await flush()

    expect(collabOf(probe).mode).toBe('collab')
    expect(collabOf(probe).state).toBe('connected')
    expect(collabOf(probe).writable).toBe(true)
    expect(probe.rows[0]).toMatchObject({ ton: 12.5, remark: '急单' })
  })

  it('两个客户端：一端改吨位/备注，另一端 rows 同步更新', async () => {
    const network = createFakeCollabNetwork()
    const probeA: Probe = { collab: null, rows: [] }
    const probeB: Probe = { collab: null, rows: [] }
    const containerB = document.createElement('div')
    document.body.appendChild(containerB)
    const rootB = createRoot(containerB)
    const options = { transportFactory: network.createTransport }

    act(() => {
      root.render(
        createElement(ProbeComponent, {
          initialRows: rowsOf(),
          options: baseOptions(options),
          probe: probeA,
        }),
      )
    })
    act(() => {
      rootB.render(
        createElement(ProbeComponent, {
          initialRows: rowsOf(),
          options: baseOptions({
            ...options,
            localUser: { id: 'u2', name: '李四' },
          }),
          probe: probeB,
        }),
      )
    })
    await flush()

    // A 改吨位 → A 本地的 rows 立即更新（观察者回写），B 也看到
    act(() => probeA.collab?.patchItem('r1', { ton: 20 }))
    await flush()
    expect(probeA.rows[0]?.ton).toBe(20)
    expect(probeB.rows[0]?.ton).toBe(20)

    // B 改备注 → A 看到
    act(() => probeB.collab?.patchItem('r1', { remark: '李四改的' }))
    await flush()
    expect(probeA.rows[0]?.remark).toBe('李四改的')
    expect(probeB.rows[0]?.remark).toBe('李四改的')

    act(() => rootB.unmount())
    containerB.remove()
  })

  it('只读票据：writable=false，patchItem 被忽略', async () => {
    const network = createFakeCollabNetwork()
    const probe = mount(
      baseOptions({
        requestSession: () => Promise.resolve(sessionOutcome(false)),
        transportFactory: network.createTransport,
      }),
    )
    await flush()

    expect(collabOf(probe).writable).toBe(false)
    act(() => collabOf(probe).patchItem('r1', { ton: 99 }))
    expect(probe.rows[0]?.ton).toBe(12.5)
  })

  it('行光标按 80ms 节流上报，远端 peersOfRow 能定位到行', async () => {
    const network = createFakeCollabNetwork()
    const probeA: Probe = { collab: null, rows: [] }
    const probeB: Probe = { collab: null, rows: [] }
    const containerB = document.createElement('div')
    document.body.appendChild(containerB)
    const rootB = createRoot(containerB)
    const options = { transportFactory: network.createTransport }

    act(() => {
      root.render(
        createElement(ProbeComponent, {
          initialRows: rowsOf(),
          options: baseOptions(options),
          probe: probeA,
        }),
      )
    })
    act(() => {
      rootB.render(
        createElement(ProbeComponent, {
          initialRows: rowsOf(),
          options: baseOptions({
            ...options,
            localUser: { id: 'u2', name: '李四' },
          }),
          probe: probeB,
        }),
      )
    })
    await flush()

    act(() => probeA.collab?.setCursor('r1'))
    expect(probeB.collab?.peersOfRow('r1')).toHaveLength(0)
    await flush(120)
    expect(probeB.collab?.peersOfRow('r1')).toHaveLength(1)
    expect(probeB.collab?.peersOfRow('r1')[0]?.user.name).toBe('张三')
    expect(probeB.collab?.peersOfRow('r2')).toHaveLength(0)

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
    // 让 afterEach 的 unmount 有根可卸
    root = createRoot(container)
  })

  it('协作撤销/重做只撤销自己的改动，不影响同行协作伙伴的修改', async () => {
    const network = createFakeCollabNetwork()
    const probeA: Probe = { collab: null, rows: [] }
    const probeB: Probe = { collab: null, rows: [] }
    const containerB = document.createElement('div')
    document.body.appendChild(containerB)
    const rootB = createRoot(containerB)
    const options = {
      transportFactory: network.createTransport,
      enableOfflinePersistence: false,
    }

    act(() => {
      root.render(
        createElement(ProbeComponent, {
          initialRows: rowsOf(),
          options: baseOptions(options),
          probe: probeA,
        }),
      )
    })
    act(() => {
      rootB.render(
        createElement(ProbeComponent, {
          initialRows: rowsOf(),
          options: baseOptions({
            ...options,
            localUser: { id: 'u2', name: '李四' },
          }),
          probe: probeB,
        }),
      )
    })
    await flush()

    // A 改 r1 吨位，B 改 r2 备注
    act(() => probeA.collab?.patchItem('r1', { ton: 55 }))
    act(() => probeB.collab?.patchItem('r2', { remark: '李四备注' }))
    await flush()

    expect(probeA.collab?.canUndo).toBe(true)
    expect(probeA.rows[0]?.ton).toBe(55)
    expect(probeA.rows[1]?.remark).toBe('李四备注')

    // A 执行 undo：只撤回 A 自己的 r1 吨位，不撤销 B 对 r2 的备注
    act(() => probeA.collab?.undo())
    await flush()
    expect(probeA.rows[0]?.ton).toBe(12.5)
    expect(probeA.rows[1]?.remark).toBe('李四备注')
    expect(probeB.rows[0]?.ton).toBe(12.5)

    // A 执行 redo：恢复 r1 吨位到 55
    expect(probeA.collab?.canRedo).toBe(true)
    act(() => probeA.collab?.redo())
    await flush()
    expect(probeA.rows[0]?.ton).toBe(55)

    act(() => rootB.unmount())
    containerB.remove()
  })
})
