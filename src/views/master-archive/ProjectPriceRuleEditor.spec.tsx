// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ProjectPriceRuleEditor } from './ProjectPriceRuleEditor'

const { fetchMock, saveMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  saveMock: vi.fn(),
}))

vi.mock('@/api/master/project-price-rules', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/master/project-price-rules')>()
  return {
    ...actual,
    fetchProjectPriceRules: fetchMock,
    saveProjectPriceRules: saveMock,
  }
})

describe('ProjectPriceRuleEditor', () => {
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
    fetchMock.mockReset()
    saveMock.mockReset()
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    // 用宏任务冲刷 React 调度队列(微任务不足以排空 scheduler),
    // 再卸载, 避免 jsdom 销毁后 React 仍执行调度任务而报 window is not defined。
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    act(() => root.unmount())
    container.remove()
  })

  it('加载并展示已有价格规定', async () => {
    fetchMock.mockResolvedValue([
      { id: '1', name: '含税价', mode: 'ADD', amount: 30, sortOrder: 0 },
    ])
    await act(async () => {
      root.render(createElement(ProjectPriceRuleEditor, { projectId: 'p1' }))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledWith('p1')
    expect(container.textContent).toContain('价格规定')
    const nameInput = container.querySelector<HTMLInputElement>(
      'input[placeholder="如 含税价"]',
    )
    expect(nameInput?.value).toBe('含税价')
  })

  it('新增规定后保存调用整体替换接口', async () => {
    fetchMock.mockResolvedValue([])
    saveMock.mockResolvedValue([
      { id: '9', name: '到货价', mode: 'SUBTRACT', amount: 10, sortOrder: 0 },
    ])
    await act(async () => {
      root.render(createElement(ProjectPriceRuleEditor, { projectId: 'p1' }))
      await Promise.resolve()
      await Promise.resolve()
    })

    // 点击「新增规定」
    const addBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('新增规定'),
    )
    await act(async () => {
      addBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    // 填写名称
    const nameInput = container.querySelector<HTMLInputElement>(
      'input[placeholder="如 含税价"]',
    )
    expect(nameInput).not.toBeNull()
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.bind(nameInput)
      setter?.('到货价')
      nameInput?.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
    })

    // 保存
    const saveBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('保存价格规定'),
    )
    await act(async () => {
      saveBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(saveMock).toHaveBeenCalledTimes(1)
    const [projectId, payload] = saveMock.mock.calls[0]
    expect(projectId).toBe('p1')
    expect(Array.isArray(payload)).toBe(true)
    const row = (payload as { name: string }[]).find((r) => r.name === '到货价')
    expect(row).toBeTruthy()
  })

  it('名称为空时保存被拦截', async () => {
    fetchMock.mockResolvedValue([])
    await act(async () => {
      root.render(createElement(ProjectPriceRuleEditor, { projectId: 'p1' }))
      await Promise.resolve()
      await Promise.resolve()
    })
    const addBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('新增规定'),
    )
    await act(async () => {
      addBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    const saveBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('保存价格规定'),
    )
    await act(async () => {
      saveBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    expect(saveMock).not.toHaveBeenCalled()
  })
})
