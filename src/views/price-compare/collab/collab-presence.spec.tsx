// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { CollabStatusBar } from './CollabStatusBar'
import type { CollabPeer } from './collab-presence'
import { CollabCellCursors } from './RemoteCursors'

/**
 * Awareness 的呈现层：远端光标（单元格描边 + 用户名标签）与连接状态徽标。
 *
 * <p>锁三件事：① 没有远端光标时**不渲染任何节点**（DOM 与未接入协作时一致）；
 * ② 多人在同一格时人名都能读到；③ 状态徽标用 `role="status"` + `aria-live`，
 * 读屏用户能在连接状态变化时被动获知（状态是异步变化的，不能只靠颜色）。</p>
 */

const peer = (overrides: Partial<CollabPeer> = {}): CollabPeer => ({
  clientId: 2,
  listId: 'list-1',
  user: { id: 'u2', name: '张三', color: '#1677ff' },
  cursor: { cellKey: 'k1' },
  ...overrides,
})

describe('CollabCellCursors 远端光标', () => {
  let container: HTMLDivElement
  let root: Root

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

  const render = (cursors: CollabPeer[]) => {
    act(() => {
      root.render(createElement(CollabCellCursors, { cursors }))
    })
  }

  it('没有远端光标时不渲染任何节点（不占位、不改 DOM）', () => {
    render([])
    expect(container.innerHTML).toBe('')
  })

  it('渲染彩色描边与用户名标签', () => {
    render([peer()])
    const cursor = container.querySelector('.collab-cell-cursor')
    expect(cursor).not.toBeNull()
    // 颜色来自 awareness 的用户色（同用户跨端一致），内联下发
    expect((cursor as HTMLElement).style.borderColor).toBe('rgb(22, 119, 255)')
    const label = container.querySelector('.collab-cell-cursor-name')
    expect(label?.textContent).toBe('张三')
  })

  it('同一格多人：人名全部可读，覆盖层对读屏隐藏（名单已有可访问文本）', () => {
    render([
      peer(),
      peer({
        clientId: 3,
        user: { id: 'u3', name: '李四', color: '#52c41a' },
      }),
    ])
    const labels = Array.from(
      container.querySelectorAll('.collab-cell-cursor-name'),
    ).map((node) => node.textContent)
    expect(labels).toEqual(['张三', '李四'])
    expect(
      container
        .querySelector('.collab-cell-cursors')
        ?.getAttribute('aria-hidden'),
    ).toBe('true')
  })
})

describe('CollabStatusBar 状态徽标与在线名单', () => {
  let container: HTMLDivElement
  let root: Root

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

  const render = (
    state: Parameters<typeof CollabStatusBar>[0]['state'],
    writable = true,
    peers: CollabPeer[] = [],
  ) => {
    act(() => {
      root.render(createElement(CollabStatusBar, { state, writable, peers }))
    })
  }

  it('未开启协作时整条不渲染（不留空行）', () => {
    render('disabled')
    expect(container.innerHTML).toBe('')
  })

  it('已连接且可写：显示"实时协作中"与"仅你在线"', () => {
    render('connected')
    const status = container.querySelector('.collab-status')
    expect(status).not.toBeNull()
    expect(status?.getAttribute('role')).toBe('status')
    expect(status?.getAttribute('aria-live')).toBe('polite')
    expect(container.textContent).toContain('实时协作中')
    expect(container.textContent).toContain('仅你在线')
  })

  it('只读票据：显示"只读协作"', () => {
    render('connected', false)
    expect(container.textContent).toContain('只读协作')
  })

  it('离线回退：提示改动将在重连后同步', () => {
    render('offline')
    expect(container.textContent).toContain('离线，改动将在重连后同步')
  })

  it('在线名单：人数含自己，且列出远端用户名', () => {
    render('connected', true, [
      peer(),
      peer({
        clientId: 3,
        user: { id: 'u3', name: '李四', color: '#52c41a' },
      }),
      // 同一用户出现在两张价格表的 awareness 里：名单只出现一次，人数也只算一个
      peer({ clientId: 4, listId: 'list-2' }),
    ])
    expect(container.textContent).toContain('在线 3 人')
    const names = Array.from(
      container.querySelectorAll('.collab-status__peer'),
    ).map((node) => node.textContent)
    expect(names).toEqual(['张三', '李四'])
  })
})
