// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { PriceCompareEditLockBanner } from './PriceCompareEditLockBanner'

type BannerProps = Parameters<typeof PriceCompareEditLockBanner>[0]

describe('PriceCompareEditLockBanner', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    act(() => root.unmount())
    container.remove()
  })

  const render = (overrides: Partial<BannerProps> = {}) => {
    const props: BannerProps = {
      conflict: false,
      lock: null,
      onDiscardLocal: vi.fn(),
      onTakeover: vi.fn(),
      ...overrides,
    }
    act(() => {
      root.render(createElement(PriceCompareEditLockBanner, props))
    })
    return props
  }

  const buttonByText = (text: string) =>
    Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(text),
    )

  it('本人签出: 只提示, 不提供接管/放弃操作', () => {
    render({ lock: { mine: true, locked: true, sheetId: '9001' } })
    expect(container.textContent).toContain('你正在编辑该批次')
    expect(container.querySelector('.ant-alert-success')).not.toBeNull()
    expect(buttonByText('申请接管')).toBeUndefined()
    expect(buttonByText('放弃')).toBeUndefined()
  })

  it('他人签出: 提供「申请接管」, 不显示放弃入口', () => {
    const props = render({
      lock: { mine: false, locked: true, sheetId: '9001', ownerName: '李四' },
    })
    expect(container.textContent).toContain('李四')
    const takeover = buttonByText('申请接管')
    expect(takeover).toBeTruthy()
    act(() => {
      takeover?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(props.onTakeover).toHaveBeenCalled()
    expect(buttonByText('放弃我的改动并重新加载')).toBeUndefined()
  })

  it('锁冲突(锁可能已不在本机): 说明原因并提供「放弃我的改动并重新加载」', async () => {
    render({ conflict: true, lock: null })
    expect(container.textContent).toContain('本批次的改动已停止自动保存')
    const discard = buttonByText('放弃我的改动并重新加载')
    expect(discard).toBeTruthy()

    // 破坏性操作需二次确认: 点击后应出现确认浮层(antd Popconfirm)
    await act(async () => {
      discard?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 300))
    })
    const popover = document.querySelector('.ant-popover')
    expect(popover).not.toBeNull()
    expect(popover?.textContent).toContain('放弃本地未保存的改动')
    // antd 会在两个汉字之间插入空格(确 认 / 取 消)
    expect(popover?.textContent).toContain('确 认')
    expect(popover?.textContent).toContain('取 消')
  })
})
