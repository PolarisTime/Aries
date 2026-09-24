// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { AddProductRowButton } from './AddProductRowButton'
import type { Variety } from './types'

const varieties: Variety[] = [
  {
    category: '螺纹钢',
    material: 'HRB400E',
    spec: 12,
    length: '9米',
    label: '螺纹钢 HRB400E Φ12 9米',
  },
  {
    category: '盘螺',
    material: 'HRB400E',
    spec: 8,
    length: '9米',
    label: '盘螺 HRB400E Φ8 9米',
  },
]

describe('AddProductRowButton 添加商品行下拉', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
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
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  const render = (
    overrides: Partial<Parameters<typeof AddProductRowButton>[0]> = {},
  ) => {
    const props: Parameters<typeof AddProductRowButton>[0] = {
      varieties,
      disabled: false,
      onPick: vi.fn(),
      ...overrides,
    }
    act(() => {
      root.render(createElement(AddProductRowButton, props))
    })
    return props
  }

  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('渲染「添加一行」按钮', () => {
    render()
    const button = Array.from(container.querySelectorAll('button')).find(
      (node) => node.textContent?.includes('添加一行'),
    )
    expect(button).toBeTruthy()
  })

  it('禁用时按钮不可点击', () => {
    render({ disabled: true })
    const button = Array.from(container.querySelectorAll('button')).find(
      (node) => node.textContent?.includes('添加一行'),
    ) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('无可选商品时按钮禁用', () => {
    render({ varieties: [] })
    const button = Array.from(container.querySelectorAll('button')).find(
      (node) => node.textContent?.includes('添加一行'),
    ) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('点击展开商品下拉并按类别展示', async () => {
    render()
    const button = Array.from(container.querySelectorAll('button')).find(
      (node) => node.textContent?.includes('添加一行'),
    ) as HTMLButtonElement
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    const menu = document.querySelector('.ant-dropdown')
    expect(menu?.textContent).toContain('螺纹钢')
    expect(menu?.textContent).toContain('盘螺')
    expect(menu?.textContent).toContain('HRB400E 12 9米')
  })

  it('选中商品触发 onPick 并回传该项', async () => {
    const props = render()
    const button = Array.from(container.querySelectorAll('button')).find(
      (node) => node.textContent?.includes('添加一行'),
    ) as HTMLButtonElement
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    const option = Array.from(
      document.querySelectorAll('.ant-dropdown-menu-item'),
    ).find((node) => node.textContent?.includes('HRB400E 12 9米')) as
      | HTMLElement
      | undefined
    expect(option).toBeTruthy()
    act(() => {
      option?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(props.onPick).toHaveBeenCalledTimes(1)
    expect(props.onPick).toHaveBeenCalledWith(varieties[0])
  })
})
