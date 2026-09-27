// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { message } from '@/utils/antd-app'
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

/** 排空 React scheduler 的宏任务队列(setImmediate): 仅 await 微任务不足以排空。 */
async function flushMacrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0))
  // setImmediate 来自 Node 运行时, 不在 DOM lib 类型里, 故显式取值。
  const scheduleImmediate = (
    globalThis as { setImmediate?: (callback: () => void) => unknown }
  ).setImmediate
  if (typeof scheduleImmediate === 'function') {
    await new Promise<void>((resolve) => {
      scheduleImmediate(() => resolve())
    })
  }
}

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
    // antd 静态 message 会在 document.body 上自建 React 根, 不在下方 root 内。
    // 不销毁它, 其挂起的状态更新会在 jsdom 环境销毁后由 scheduler 执行, 抛
    // "ReferenceError: window is not defined" 的 unhandled error, 使整个测试进程 exit≠0。
    message.destroy()
    // 用宏任务冲刷 React 调度队列(微任务不足以排空 scheduler), 再卸载。
    await act(async () => {
      await flushMacrotasks()
    })
    act(() => root.unmount())
    await act(async () => {
      await flushMacrotasks()
    })
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
